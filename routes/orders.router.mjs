// Import necessary modules
import express from 'express';
import {addRecipeMapping, getOrderDetails, placeOrder} from '../controllers/orders.controller.mjs';

const ordersRouter = express.Router();

// Define routes for order controller
ordersRouter.post('/place-order', placeOrder);
ordersRouter.post('/add-selected-recipes', addRecipeMapping);
ordersRouter.get('/:orderId', getOrderDetails);

// Export the router
export default ordersRouter;
