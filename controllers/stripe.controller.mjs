import stripePackage from 'stripe';
import {getCustomerByEmail} from "./custoemr.controller.mjs";
import {
    addRecipeMapping_v2,
    generateRandomRecipePayload,
    getOrderDetails,
    placeOrder_v2
} from "./orders.controller.mjs";
import {sendMessageToAll} from "./websocket.controller.mjs";
import {subscribe} from "../helpers/pubsub.mjs";

const stripe = stripePackage('sk_test_51Os7kqANqKE86m4zlzLkmfDMIl975fWda86rBMvOU88hMEZaBhEKqyQiNE8ypGbZWQ7Ol9kZpBXQg6SrcSu8R0qa000UkVVT0S');
// Endpoint to handle webhook events
const webhookSecret = 'whsec_1CrL5xgrRkQfCz1qmhQ34zb8bzIlqIYb'; // Replace with your webhook secret

export const stripe_webhook = async (req, res) => {
    const eventPayload = req.body; // Assuming rawBody contains the raw request body
    const sig = req.headers['stripe-signature'];

    try {

        let event;
        try {
            event = stripe.webhooks.constructEvent(eventPayload, sig, webhookSecret);
        } catch (err) {
            console.error('Error verifying webhook signature:', err);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle payment success event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object; // Use 'event' instead of 'verifiedEvent'
            const subscription_id = session.subscription;
            const initial_payment_id = session.payment_intent;
            const stripe_customer_id = session.customer;
            const customer_email = session.customer_email;
            const amount_paid = session.amount_total;
            // Save subscriptionId, paymentId, customerId to your database
            console.log('creating order:')
            await create_order({stripe_customer_id, customer_email, subscription_id, initial_payment_id, amount_paid});
        }

        res.status(200).end();
    } catch (err) {
        console.error('Error handling webhook event:', err);
        res.status(400).send('Webhook Error: ' + err.message);
    }
}
export const create_order = async (req) => {
    console.log('------------create_order---------------');
    const {
        stripe_customer_id,
        customer_email,
        subscription_id,
        initial_payment_id,
        amount_paid
    } = req;
    let customer_id = null;
    const resp = await getCustomerByEmail({email: customer_email}, {})
    if (resp) {
        customer_id = resp.customer_id
        const order_id = await placeOrder_v2(
            {
                customer_id,
                number_of_people: null,
                delivery_date: null,
                active_week: 1,
                initial_payment_id,
                amount_paid,
                stripe_customer_id
            });
        const mappings = await generateRandomRecipePayload(3, 1);
        if (mappings) {
            await addRecipeMapping_v2({order_id, mappings})
        }
        const orderDetails = await getOrderDetails(order_id)
        subscribe('ws_message', function(message) {
            console.log('ws_message: Received message:', message);
            console.log('order_id:', order_id);
            sendMessageToAll( orderDetails );
        });
    }
}

export const create_subscription = async (req, res) => {
    try {
        const product = await stripe.products.create({
            name: req.body.productName,
            type: 'service',
        });

        // Create price
        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(req.body.price * 100), // price in cents
            currency: 'usd',
            recurring: {
                interval: 'week', // Billing interval (e.g., month, week, year)
                interval_count: 4, // Number of intervals between each billing cycle
            },
        });

        // Return product and price IDs to the client
        res.json({productId: product.id, priceId: price.id});
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).send('Error creating subscription');
    }
}

