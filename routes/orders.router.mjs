// Import necessary modules
import express from 'express';
import {
    addRecipeMapping, getActiveOrderDetails,
    getOrderDetailsByCustomerId,
    getOrderDetailsEndpoint, getPlanSetting,
    placeOrder, updateOrder
} from '../controllers/orders.controller.mjs';

const ordersRouter = express.Router();

// Define routes for order controller
ordersRouter.post('/place-order', placeOrder);
ordersRouter.post('/add-selected-recipes', addRecipeMapping);
ordersRouter.post('/fetch-order', getOrderDetailsEndpoint);
ordersRouter.get('/activeOrder', getActiveOrderDetails);
ordersRouter.post('/update-order', updateOrder);
ordersRouter.post('/getPlanSetting', getPlanSetting);
ordersRouter.get('/getOrderDetails/:customer_id:', getOrderDetailsByCustomerId);

// Export the router
export default ordersRouter;
