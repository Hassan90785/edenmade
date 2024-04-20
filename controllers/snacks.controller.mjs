import {ErrorResponse, successResponseWithData} from "../helpers/apiresponse.mjs";
import pool from "../db/dbConnection.mjs";

/**
 * Get all recipes
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const getAllSnacks = async (req, res) => {
    try {
        // Query the database to retrieve all recipes with category names
        const query = `
            SELECT * from snacks
        `;
        const [rows] = await pool.query(query);

        // Return success response with data
        return successResponseWithData(res, 'All snacks retrieved successfully', rows);
    } catch (error) {
        console.error('Error retrieving all snacks:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};
/**
 * Get Snack Order
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const getSnackOrder = async (req, res) => {
    try {
        const { order_id, active_week } = req.query;
        console.log('getSnackOrder: ', req.query)
        const query = `
            select sm.*, s.price, s.name from snacks_mapping sm join snacks s on sm.snacks_id = s.snacks_id  
            where sm.order_id = ? and sm.week = ?
        `;
        const [rows] = await pool.query(query,[order_id, active_week]);

        // Return success response with data
        return successResponseWithData(res, 'All snacks retrieved successfully', rows);
    } catch (error) {
        console.error('Error retrieving  snacks order:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};

/**
 * Add New Smacks Mapping
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const addNewSnacksMapping = async (req, res) => {
    try {
        // Extract necessary data from the request body
        const {order_id, week, snacks} = req.body;
        const sum = snacks.reduce((total, snack) => total + snack.price, 0);
        // Construct the INSERT query
        const insertQuery = `
            INSERT INTO snacks_mapping (order_id, week, snacks_id, snacks_price, portion, due_amount)
            VALUES ?
        `;

        // Prepare values to be inserted
        const values = snacks.map(({snacks_id, portion, price}) => [order_id, week, snacks_id, price, portion, sum]);

        // Insert new entries into the database
        await pool.query(insertQuery, [values]);

        // Construct comma-separated list of inserted snacks
        const insertedSnacks = snacks.map(({snacks_id}) => snacks_id).join(',');

        // Fetch rows from orderrecipemapping based on order_id and week
        const selectQuery = `
            SELECT * FROM orderrecipemapping
            WHERE order_id = ? AND week = ?
        `;
        const [rows] = await pool.query(selectQuery, [order_id, week]);

        // Update fetched rows with comma-separated values of inserted snacks
        if (rows.length > 0) {
            const updatedRow = rows[0];
            const updatedStackMappingIds = updatedRow.stack_mapping_ids ? `${updatedRow.stack_mapping_ids},${insertedSnacks}` : insertedSnacks;

            // Construct the UPDATE query
            const updateQuery = `
                UPDATE orderrecipemapping
                SET stack_mapping_ids = ?
                WHERE order_id = ? AND week = ?
            `;
            // Update the row in the database
            await pool.query(updateQuery, [updatedStackMappingIds, order_id, week]);
        }

        // Return success response with inserted data
        return successResponseWithData(res, `New snacks mapping for order ${order_id} inserted successfully`, {
            order_id,
            week,
            insertedSnacks,
            total_amount: sum
        });
    } catch (error) {
        console.error('Error inserting new snacks mapping:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};

/**
 * Update Payment Snacks Mapping
 * @param orderDetails
 * @returns {Promise<*|string>}
 */
export const updatePaymentSnacksMapping = async (orderDetails) => {
    try {
        // Extract necessary data from the request body
        console.log('orderDetails: ', orderDetails)
        const {order_id, active_week, payment_intent, amount_total} = orderDetails;
        // Construct the INSERT query
        const updateQuery = `
            Update snacks_mapping  set payment_id =?, paid_amount = ? 
            where
            order_id=? and week=?
        `;

        // Insert new entries into the database
        await pool.query(updateQuery, [payment_intent, amount_total, order_id, active_week]);


        // Return success response with inserted data
        return 'Success'
    } catch (error) {
        console.error('Error inserting new snacks mapping:', error);
        return error
    }
};

