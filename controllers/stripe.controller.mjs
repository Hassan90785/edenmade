import stripePackage from 'stripe';
import {getOrderIdByCustomerEmail, updateOrderRecipeMapping} from "./orders.controller.mjs";
import {getCustomerId, getOrderId} from "../helpers/util.mjs";
import {updatePaymentSnacksMapping} from "./snacks.controller.mjs";
import {config} from "../config/config.mjs";

const stripe = stripePackage(config.stripe);
// Endpoint to handle webhook events
const webhookSecret = config.stripe_webhook; // Replace with your webhook secret

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
        console.log('****************--------------------WEBHOOK------------***************')

        console.log('event.type: ', event.type)
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const subscription_id = session.subscription;
            if (!subscription_id) {
                console.log('One Time Payment:')
                console.log('session:', session)
                const {amount_total, customer_email, payment_intent, ...otherSessionDetails} = session
                const customer_id = await getCustomerId(customer_email);
                if (customer_id) {
                    const orderDetails = await getOrderId(customer_id);
                    console.log('---------')
                    console.log('-orderDetails:', orderDetails)
                    if (orderDetails) {
                        await updatePaymentSnacksMapping({...orderDetails, amount_total, payment_intent})
                    }
                }
            }

        }

        // Handle payment success event
        if (event.type === 'invoice.payment_succeeded') {
            console.log('>>>>>>>invoice.paid', event.data)
            const session = event.data.object;
            const subscription_id = session.subscription;
            const paymentId = session.payment_intent;
            const customer_email = session.customer_email;
            const amount_paid = session.amount_paid;
            const paymentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const paymentNumber = await determinePaymentNumber(subscription_id, customer_email, paymentId, paymentDate); // Implement this function to fetch payment number from your database
            console.log('Email Sent!')
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
export const create_checkout_session_v2 = async (req, res) => {
    try {
        const product = await stripe.products.create({
            name: req.body.productName,
            type: 'service',
        });

        // Create price
        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(req.body.price * 100), // price in cents
            currency: 'usd'
        });

        // Return product and price IDs to the client
        res.json({productId: product.id, priceId: price.id});
    } catch (error) {
        console.error('Error creating create_checkout_session_v2:', error);
        res.status(500).send('Error creating create_checkout_session_v2');
    }
}
export const create_checkout_session = async (req, res) => {
    try {
        // Create a checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'], // Payment method types allowed
            line_items: [{
                price_data: {
                    currency: 'usd', // Currency
                    product_data: {
                        name: req.body.productName, // Product name
                    },
                    unit_amount: Math.round(req.body.amount), // Amount in cents
                },
                quantity: 1, // Quantity
            }],
            mode: 'payment', // Mode: payment for one-time payment
            success_url: `${req.protocol}://${req.get('host')}/success`, // Redirect URL after successful payment
            cancel_url: `${req.protocol}://${req.get('host')}/cancel`, // Redirect URL after canceled payment
        });

        // Return session ID to the client
        res.json({sessionId: session.id});
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).send('Error creating checkout session');
    }
}

export const trigger_manual_payment = async (req, res) => {
    try {
        console.log('*********trigger_manual_payment**********')
        const subscriptionId = req.body.subscriptionId; // Assuming you receive the subscription ID in the request body

        // Update the subscription to trigger immediate payment
        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            billing_cycle_anchor: 'now', // Trigger payment immediately
        });
        console.log('updatedSubscription: ', updatedSubscription)
        // If you need to handle the updated subscription object, you can do so here
        console.log('******END trigger_manual_payment******')
        // Return success message to the client
        res.json({message: 'Manual payment triggered successfully.'});
    } catch (error) {
        console.error('Error triggering manual payment:', error);
        res.status(500).send('Error triggering manual payment');
    }
}


const createNewPriceForSubscription = async (subscriptionId, newPrice) => {
    try {
        // Retrieve the existing subscription to get the current price ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentPriceId = subscription.items.data[0].price.id;

        // Create a new price with the desired amount
        const createdPrice = await stripe.prices.create({
            unit_amount: newPrice * 100, // Stripe expects the amount in cents
            currency: 'usd', // Adjust currency as needed
            product: subscription.items.data[0].price.product, // Use the same product as the current price
            recurring: {
                interval: subscription.items.data[0].price.recurring.interval, // Use the same interval as the current price
            },
        });

        // Update the subscription with the new price
        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            items: [{
                id: subscription.items.data[0].id,
                price: createdPrice.id, // Link the new price to the subscription
            }],
        });
        console.log('Price Updated newId:  ', createdPrice.id, ' - against subscriptionID: ', subscriptionId)
        return updatedSubscription;
    } catch (error) {
        throw new Error('Error creating new price for subscription: ' + error.message);
    }
};


export const getPriceByPaymentId = async (paymentId) => {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
        console.log('getPriceByPaymentId- paymentId: ', paymentId)
        console.log('getPriceByPaymentId: ', paymentIntent.amount)
        return paymentIntent.amount / 100;
    } catch (error) {
        throw new Error('Error fetching price by payment ID: ' + error.message);
    }
};

export const getPriceBySubscriptionId = async (subscriptionId) => {
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id; // Assuming only one item in subscription
        const price = await stripe.prices.retrieve(priceId);
        console.log('getPriceBySubscriptionId - subscriptionId: ', subscriptionId)
        console.log('getPriceBySubscriptionId: ', price.unit_amount)
        return price.unit_amount;
    } catch (error) {
        throw new Error('Error fetching price by subscription ID: ' + error.message);
    }
};

