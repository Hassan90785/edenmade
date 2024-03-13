// orderController.mjs

import {ErrorResponse, successResponse, successResponseWithData} from "../helpers/apiresponse.mjs";
import pool from "../db/dbConnection.mjs";

/**
 * Place an order
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const placeOrder = async (req, res) => {
    try {
        // Extract order details from the request body
        const {
            customer_id,
            number_of_people,
            delivery_date,
            active_week,
            subscription_id,
            initial_payment_id,
            amount_paid
        } = req.body;

        // Create the order
        const orderQuery = `
            INSERT INTO orderdetails (customer_id, number_of_people, delivery_date, active_week, subscription_id, initial_payment_id, amount_paid)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [orderResult] = await pool.query(orderQuery, [customer_id, number_of_people, delivery_date, active_week, subscription_id, initial_payment_id, amount_paid]);

        const orderId = orderResult.insertId;

        return successResponseWithData(res, 'Order placed successfully', {orderId});
    } catch (error) {
        console.error('Error placing order:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};


export const addRecipeMapping = async (req, res) => {
    try {
        const {order_id, mappings} = req.body;

        // Save the recipe mappings for the order
        const mappingsPromises = mappings.map(async (mapping) => {
            const mappingQuery = `
                INSERT INTO orderrecipemapping (order_id, week, recipe_id, recipe_price, spice_level_id, payment_id,  payment_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            await pool.query(mappingQuery, [order_id, mapping.week, mapping.recipe_id, mapping.recipe_price, mapping.spice_level_id, mapping.payment_id, mapping.payment_date]);
        });

        await Promise.all(mappingsPromises);

        return successResponse(res, 'Recipe mappings added successfully');
    } catch (error) {
        console.error('Error adding recipe mappings:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};

/**
 * Get order details by order ID
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        // Query the database to retrieve order details by order ID
        const orderQuery = `
            SELECT
                od.order_id,
                od.customer_id,
                od.number_of_people,
                od.delivery_date,
                od.active_week,
                od.subscription_id,
                od.initial_payment_id,
                od.amount_paid,
                od.created_at,
                c.first_name,
                c.last_name,
                c.email,
                m.mapping_id,
                m.week,
                m.recipe_id,
                r.title,
                r.price,
                m.spice_level_id,
                s.spice_level_name,
                m.payment_id,
                m.payment_date
            FROM orderdetails od
            JOIN customer c ON od.customer_id = c.customer_id
            LEFT JOIN orderrecipemapping m ON od.order_id = m.order_id
            LEFT JOIN recipes r ON m.recipe_id = r.recipe_id
            LEFT JOIN spicelevels s ON m.spice_level_id = s.spice_level_id
            WHERE od.order_id = ?
        `;
        const [rows] = await pool.query(orderQuery, [orderId]);

        if (rows.length === 0) {
            return ErrorResponse(res, 'Order not found', 404);
        }

        // Construct the order details object
        const orderDetails = {
            order_id: rows[0].order_id,
            customer_id: rows[0].customer_id,
            number_of_people: rows[0].number_of_people,
            delivery_date: rows[0].delivery_date,
            active_week: rows[0].active_week,
            subscription_id: rows[0].subscription_id,
            initial_payment_id: rows[0].initial_payment_id,
            amount_paid: rows[0].amount_paid,
            customer_name: rows[0].first_name + ' ' + rows[0].last_name,
            customer_email: rows[0].email,
            order_details: []
        };

        // Populate order details if mappings exist
        if (rows[0].mapping_id !== null) {
            orderDetails.order_details = rows.map(row => ({
                recipe_id: row.recipe_id,
                recipe_name: row.title,
                recipe_price: row.price,
                week: row.week,
                spice_level_id: row.spice_level_id,
                spice_level_name: row.spice_level_name,
                payment_id: row.payment_id,
                payment_date: row.payment_date,
                created_at: row.created_at
            }));
        }

        // Return success response with order details
        return successResponseWithData(res, 'Order details retrieved successfully', orderDetails);
    } catch (error) {
        console.error('Error retrieving order details:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};
