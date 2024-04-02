// Import necessary modules
import express from 'express';
import {
    addRecipeMapping,
    getOrderDetailsByCustomerId,
    getOrderDetailsEndpoint,
    placeOrder
} from '../controllers/orders.controller.mjs';

const ordersRouter = express.Router();

// Define routes for order controller
ordersRouter.post('/place-order', placeOrder);
ordersRouter.post('/add-selected-recipes', addRecipeMapping);
ordersRouter.post('/fetch-order', getOrderDetailsEndpoint);
ordersRouter.get('/getOrderDetails/:customer_id:', getOrderDetailsByCustomerId);

// Export the router
export default ordersRouter;
