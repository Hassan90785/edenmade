// Import necessary modules
import express from 'express';
import {
    addRecipeMapping,
    getOrderDetails,
    getOrderDetailsByCustomerId, getOrderDetailsEndpoint,
    placeOrder
} from '../controllers/orders.controller.mjs';

const ordersRouter = express.Router();

// Define routes for order controller
ordersRouter.post('/place-order', placeOrder);
ordersRouter.post('/add-selected-recipes', addRecipeMapping);
ordersRouter.get('/:orderId', getOrderDetailsEndpoint);
ordersRouter.get('order/:customer_id', getOrderDetailsByCustomerId);

// Export the router
export default ordersRouter;
