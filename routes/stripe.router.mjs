import express from "express";
import * as StripeController from '../controllers/stripe.controller.mjs';
import {trigger_manual_payment} from "../controllers/stripe.controller.mjs";

const stripeRouter = express.Router();

// Apply the bodyParser middleware to parse raw request bodies as JSON

// Define routes
// stripeRouter.post("/webhook", express.json({type: 'application/json'}), StripeController.stripe_webhook);
stripeRouter.post("/create_subscription", StripeController.create_subscription);
stripeRouter.post("/trigger_manual_payment", StripeController.trigger_manual_payment);

export default stripeRouter;
