import stripePackage from 'stripe';
import {getOrderIdByCustomerEmail, updateOrderRecipeMapping} from "./orders.controller.mjs";

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
            const session = event.data.object;
            const subscription_id = session.subscription;
            const initial_payment_id = session.payment_intent;
            const stripe_customer_id = session.customer;
            const customer_email = session.customer_email;
            const amount_paid = session.amount_total;

            if (subscription_id) {
                console.log('Payment Success ')
                const {paymentId, paymentDate} = await getSubscriptionPayments(subscription_id)
                console.log('paymentId: ', paymentId)
                console.log('paymentDate: ', paymentDate)
                // Determine payment number based on your records
                const paymentNumber = await determinePaymentNumber(subscription_id, customer_email, paymentId, paymentDate); // Implement this function to fetch payment number from your database
                console.log('OrderID: ', paymentNumber)
                // Handle payment logic based on payment number
                switch (paymentNumber) {
                    case 1:
                        // Handle first payment logic
                        break;
                    case 2:
                        // Handle second payment logic
                        break;
                    // Add more cases as needed
                    default:
                        // Handle logic for subsequent payments
                        break;
                }
            } else {
                // Single payment (non-subscription)
                // Handle accordingly
            }
        }

        res.status(200).end();
    } catch (err) {
        console.error('Error handling webhook event:', err);
        res.status(400).send('Webhook Error: ' + err.message);
    }
}

export const getSubscriptionPayments = async (subscriptionId) => {
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['latest_invoice.payment_intent'] // Expand to include payment details
        });
        let paymentId = null;

        let paymentDate = null
        if (subscription) {
            paymentId = subscription.latest_invoice.payment_intent.id; // Payment ID
            paymentDate = new Date(subscription.latest_invoice.payment_intent.created * 1000);
        }
        return {paymentId, paymentDate};
    } catch (error) {
        console.error('Error fetching subscription details:', error);
        throw error;
    }
};

// Function to determine payment number based on subscription ID
async function determinePaymentNumber(subscriptionId, customer_email, payment_id, payment_date) {
    console.log('determinePaymentNumber')
    const order_id = await getOrderIdByCustomerEmail(customer_email, 'S');
    console.log('order_id:: ', order_id)
    await updateOrderRecipeMapping(order_id, subscriptionId, payment_id, payment_date)
    if (order_id) {
        return order_id
    } else {
        console.log('No Order found against customer - ' + customer_email)
        return null;
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

