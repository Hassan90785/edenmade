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
            active_week,
            order_type,
            amount_paid,
            meals_per_week,
            number_of_people
        } = req.body;

        // Create the order
        const orderQuery = `
            INSERT INTO orderdetails (customer_id, order_type, active_week,  amount_paid)
            VALUES (?, ?, ?, ?)
        `;
        const [orderResult] = await pool.query(orderQuery, [customer_id, order_type, active_week, amount_paid]);

        const order_id = orderResult.insertId;
        const mapping = await generateMapping({
            order_id,
            customer_id,
            meals_per_week,
            number_of_people,
            delivery_date: new Date()
        });
        if(mapping){
            return successResponseWithData(res, 'Order placed successfully', {order_id});
        }else{
            return ErrorResponse(res, 'Internal Server Error');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};

/**
 *  Generate Mapping
 * @param order_id
 * @param customer_id
 * @param meals_per_week
 * @param delivery_date
 * @param number_of_people
 * @returns {Promise<boolean>}
 */
export const generateMapping = async ({order_id, customer_id, meals_per_week, delivery_date, number_of_people}) => {
    try {
        // Fetch 3 random recipes from the recipes table
        const recipesQuery = `
            SELECT recipe_id,  price
            FROM recipes
            ORDER BY RAND()
            LIMIT 3
        `;
        const [recipesResult] = await pool.query(recipesQuery);

        // Create mapping entries for 4 weeks
        for (let week = 1; week <= 4; week++) {
            // Calculate delivery date for each week
            const currentDeliveryDate = new Date(delivery_date);
            if (week > 1) {
                currentDeliveryDate.setDate(currentDeliveryDate.getDate() + ((week - 1) * 7)); // Increment delivery date by 7 days for each subsequent week
            }

            // Insert mapping entries based on meals_per_week
            for (let meal = 1; meal <= meals_per_week; meal++) {
                const recipeIndex = (week - 1) * meals_per_week + (meal - 1); // Calculate the index of the recipe in the recipesResult array
                const {recipe_id, price} = recipesResult[recipeIndex % 3]; // Cycle through the 3 randomly selected recipes

                // Insert mapping entry
                const mappingQuery = `
                    INSERT INTO orderrecipemapping ( order_id, week, recipe_id, spice_level_id,
                     recipe_price, delivery_date, meals_per_week, number_of_people)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;
                await pool.query(mappingQuery, [ order_id, week, recipe_id, 2, price,
                    currentDeliveryDate, meals_per_week, number_of_people]);
            }
        }

        return true; // Assuming success
    } catch (error) {
        console.error('Error generating mapping:', error);
        throw error;
    }
};

/**
 * Get latest Order Id by Customer Email
 * @param email
 * @param order_type
 * @returns {Promise<void>}
 */
export const getOrderIdByCustomerEmail = async (email, order_type) => {
    try {
        const query = `
            SELECT order_id
            FROM orderdetails
            WHERE customer_id = (
                SELECT customer_id
                FROM customer
                WHERE email = ?
                LIMIT 1
            ) AND order_type = ?
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const [result] = await pool.query(query, [email, order_type]);
        if (result.length > 0) {
            return result[0].order_id;
        } else {
            return null; // No order found
        }
    } catch (error) {
        console.error('Error fetching order ID:', error);
        throw error;
    }
};

export const placeOrder_v2 = async (orderDetails) => {
    try {
        // Extract order details from the provided object
        const {
            customer_id,
            number_of_people,
            delivery_date,
            active_week,
            subscription_id,
            stripe_customer_id,
            initial_payment_id,
            amount_paid,
            order_type
        } = orderDetails;

        // Create the order
        const orderQuery = `
            INSERT INTO orderdetails (customer_id, number_of_people, delivery_date, stripe_customer_id, active_week, subscription_id, initial_payment_id, amount_paid, order_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [orderResult] = await pool.query(orderQuery, [customer_id, number_of_people, delivery_date, stripe_customer_id, active_week, subscription_id, initial_payment_id, amount_paid, order_type]);

        const orderId = orderResult.insertId;

        // Return the order ID
        return orderId;
    } catch (error) {
        console.error('Error placing order:', error);
        throw new Error('Failed to place order');
    }
};
/**
 * updateOrderRecipeMapping
 * @param order_id
 * @param subscription_id
 * @param payment_id
 * @param payment_date
 * @returns {Promise<void>}
 */
export const updateOrderRecipeMapping = async (order_id, subscription_id, payment_id, payment_date) => {
    try {
        console.log('Updating Order Recipe Mapping...');
        console.log('Order ID:', order_id);
        console.log('Subscription ID:', subscription_id);
        console.log('Payment ID:', payment_id);
        console.log('Payment Date:', payment_date);

        // Check if subscription_id in orderdetails table is null, if so, update it with subscriptionId
        const updateSubscriptionIdQuery = `
            UPDATE orderdetails
            SET subscription_id = ?
            WHERE order_id = ? AND subscription_id IS NULL
        `;
        const subscriptionResult = await pool.query(updateSubscriptionIdQuery, [subscription_id, order_id]);
        const subscriptionRowsChanged = subscriptionResult ? subscriptionResult.affectedRows : 0;

        // Find the first set of rows in orderrecipemapping with null payment_id and payment_date
        const findNullPaymentQuery = `
            SELECT *
            FROM orderrecipemapping
            WHERE order_id = ? AND payment_id IS NULL AND payment_date IS NULL
            ORDER BY week ASC
        `;
        const nullPaymentRows = await pool.query(findNullPaymentQuery, [order_id]);

        if (nullPaymentRows[0].length > 0) {
            console.log('--------------------------')
            const nullPaymentResult = nullPaymentRows[0];
            const firstSetWeek = nullPaymentResult[0].week;
            console.log('week: ',firstSetWeek)
            const firstSetRows = nullPaymentResult.filter(row => row.week === firstSetWeek);
            for (const nullPaymentRow of firstSetRows) {
                // Update payment_id and payment_date for each row
                const updatePaymentInfoQuery = `
                    UPDATE orderrecipemapping
                    SET payment_id = ?, payment_date = ?
                    WHERE mapping_id = ?
                `;
                const paymentResult = await pool.query(updatePaymentInfoQuery,
                    [payment_id, payment_date, nullPaymentRow.mapping_id]);
                const paymentRowsChanged = paymentResult ? paymentResult.affectedRows : 0;
            }

            // Update active_week in orderdetails table with the index of the first row in the set
            const updateActiveWeekQuery = `
                UPDATE orderdetails
                SET active_week = ?
                WHERE order_id = ?
            `;
            console.log('updating active week = ', firstSetWeek, ' of orderid: ', order_id)
            const activeWeekResult = await pool.query(updateActiveWeekQuery, [firstSetWeek, order_id]);

            console.log('Order Recipe Mapping updated successfully.');
        } else {
            console.log('No rows found with null payment_id and payment_date.');
        }
    } catch (error) {
        console.error('Error updating Order Recipe Mapping:', error);
        throw error;
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
            await pool.query(mappingQuery, [order_id, mapping.week, mapping.recipe_id, mapping.recipe_price,
                mapping.spice_level_id, mapping.payment_id, mapping.payment_date]);
        });

        await Promise.all(mappingsPromises);

        return successResponse(res, 'Recipe mappings added successfully');
    } catch (error) {
        console.error('Error adding recipe mappings:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};
export const addRecipeMapping_v2 = async (req) => {
    try {
        const {order_id, mappings} = req;

        // Save the recipe mappings for the order
        const mappingsPromises = mappings.map(async (mapping) => {
            const mappingQuery = `
                INSERT INTO orderrecipemapping (order_id, week, recipe_id, recipe_price, spice_level_id)
                VALUES (?, ?, ?, ?, ?)
            `;
            await pool.query(mappingQuery, [order_id, mapping.week, mapping.recipe_id, mapping.recipe_price,
                mapping.spice_level_id]);
        });

        await Promise.all(mappingsPromises);
        console.log('Recipe mappings added successfully')
        return true;
    } catch (error) {
        console.error('Error adding recipe mappings:', error);
        throw new Error('Failed to add recipe mappings');
    }
};
export const generateRandomRecipePayload = async (count, week) => {
    try {
        // Fetch the required number of recipes randomly
        const recipeQuery = `SELECT * FROM recipes ORDER BY RAND() LIMIT ?`;
        const [recipes] = await pool.query(recipeQuery, [count]);

        // Prepare the payload array
        const payload = [];

        // Loop through each randomly selected recipe to create the payload
        for (const recipe of recipes) {
            const recipePayload = {
                recipe_id: recipe.recipe_id,
                recipe_price: recipe.recipe_price,
                spice_level_id: 2, // Set spice level to 1
                week: week // Set spice level to 1
            };
            payload.push(recipePayload);
        }

        return payload;
    } catch (error) {
        console.error('Error generating random recipe payload:', error);
        throw new Error('Failed to generate recipe payload');
    }
}

/**
 * Get order details by order ID
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
// Function to get order details by order ID
export const getOrderDetails = async (orderId) => {
    try {
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
            return null; // Return null if order not found
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

        return orderDetails; // Return order details object
    } catch (error) {
        console.error('Error retrieving order details:', error);
        throw error; // Rethrow error to be caught by the caller
    }
};

// Endpoint handler to get order details by order ID
export const getOrderDetailsEndpoint = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const orderDetails = await getOrderDetails(orderId);

        if (!orderDetails) {
            return ErrorResponse(res, 'Order not found', 404);
        }

        return successResponseWithData(res, 'Order details retrieved successfully', orderDetails);
    } catch (error) {
        console.error('Error retrieving order details:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};

/**
 * Get order details by customer ID
 * @param req
 * @param res
 * @returns {Promise<*>}
 */


export const getOrderDetailsByCustomerId = async (req, res) => {
    try {
        console.log('getOrderDetailsByCustomerId')
        // Extract customer ID from request parameters
        const {customer_id} = req.params;
        console.log('customer_id: ', customer_id)

        // Validate customer ID
        if (!customer_id) {
            return ErrorResponse(res, 'Customer ID is required', 400);
        }

        // Query to retrieve order ID for the given customer ID
        const orderIdQuery = `SELECT * FROM orderdetails WHERE customer_id = ?`;
        const [orderIdRows] = await pool.query(orderIdQuery, [customer_id]);

        // Check if order ID exists for the given customer ID
        if (orderIdRows.length === 0) {
            return ErrorResponse(res, 'Order not found', 404);
        }

        const orderId = orderIdRows[0].order_id;

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
        // return successResponseWithData(res, 'Order details retrieved successfully', orderIdRows);
        return successResponseWithData(res, 'Order details retrieved successfully', orderDetails);
    } catch (error) {
        console.error('Error retrieving order details:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};

