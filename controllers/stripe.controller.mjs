import stripePackage from 'stripe';
import * as buffer from "buffer";
import {json} from "express";

const stripe = stripePackage('sk_test_51Os7kqANqKE86m4zlzLkmfDMIl975fWda86rBMvOU88hMEZaBhEKqyQiNE8ypGbZWQ7Ol9kZpBXQg6SrcSu8R0qa000UkVVT0S');
// Endpoint to handle webhook events
const webhookSecret = 'whsec_1CrL5xgrRkQfCz1qmhQ34zb8bzIlqIYb'; // Replace with your webhook secret

export const stripe_webhook = async (req, res) => {
    const eventPayload = req.body; // Assuming rawBody contains the raw request body
    const sig = req.headers['stripe-signature'];

    try {
        // Log event payload and signature for debugging
        console.log('-----------------------------')
        console.log('eventPayload: ', eventPayload);
        console.log('Signature: ', sig);
        console.log('*******************************')

        // Verify the webhook signature
        let event;
        try {
            event = stripe.webhooks.constructEvent(eventPayload, sig, webhookSecret);
            console.log('Event: ', event); // Log the event object for inspection
        } catch (err) {
            console.error('Error verifying webhook signature:', err);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle payment success event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object; // Use 'event' instead of 'verifiedEvent'
            const subscriptionId = session.subscription;
            const paymentId = session.payment_intent;
            const customerId = session.customer;
            // Save subscriptionId, paymentId, customerId to your database
            console.log('Subscription ID:', subscriptionId);
            console.log('Payment ID:', paymentId);
            console.log('Customer ID:', customerId);
        }

        res.status(200).end();
    } catch (err) {
        console.error('Error handling webhook event:', err);
        res.status(400).send('Webhook Error: ' + err.message);
    }
}


export const create_subscription = async (req, res) => {
    try {
        console.log('create_subscription')
        console.log('create_subscription: productName: ',req.body.productName )
        console.log('create_subscription: price: ',req.body.price )
        const product = await stripe.products.create({
            name: req.body.productName,
            type: 'service',
        });

        // Create price
        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: req.body.price * 100, // price in cents
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

