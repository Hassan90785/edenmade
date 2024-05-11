import express from "express";
import * as StripeController from '../controllers/stripe.controller.mjs';
import {
    create_checkout_session,
    create_checkout_session_v2, pauseSubscription,
    trigger_manual_payment
} from "../controllers/stripe.controller.mjs";

const stripeRouter = express.Router();

// Apply the bodyParser middleware to parse raw request bodies as JSON

// Define routes
// stripeRouter.post("/webhook", express.json({type: 'application/json'}), StripeController.stripe_webhook);
stripeRouter.post("/create_subscription", StripeController.create_subscription);
stripeRouter.post("/create_checkout_session", StripeController.create_checkout_session);
stripeRouter.post("/create_checkout_session_v2", StripeController.create_checkout_session_v2);
stripeRouter.post("/pauseSubscription", StripeController.pauseSubscription);
stripeRouter.post("/resumeSubscription", StripeController.resumeSubscription);
stripeRouter.post("/cancelSubscription", StripeController.cancelSubscription);
stripeRouter.post("/trigger_manual_payment", StripeController.trigger_manual_payment);

export default stripeRouter;
