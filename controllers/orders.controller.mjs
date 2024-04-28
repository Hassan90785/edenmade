// orderController.mjs

import {ErrorResponse, successResponse, successResponseWithData} from "../helpers/apiresponse.mjs";
import pool from "../db/dbConnection.mjs";
import {getPriceByPaymentId, getPriceBySubscriptionId} from "./stripe.controller.mjs";
import {sendEmail} from "./email.controller.mjs";

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
            due_amount: amount_paid,
            delivery_date: new Date()
        });
        if (mapping) {
            return successResponseWithData(res, 'Order placed successfully', {order_id});
        } else {
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
export const generateMapping = async ({
                                          order_id,
                                          customer_id,
                                          meals_per_week,
                                          delivery_date,
                                          number_of_people,
                                          due_amount
                                      }) => {
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
                     recipe_price, delivery_date, meals_per_week, number_of_people, due_amount)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                await pool.query(mappingQuery, [order_id, week, recipe_id, 2, price,
                    currentDeliveryDate, meals_per_week, number_of_people, due_amount]);
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
        const price = await getPriceByPaymentId(payment_id)
        console.log('price:: ',price)
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
            console.log('week: ', firstSetWeek)
            const firstSetRows = nullPaymentResult.filter(row => row.week === firstSetWeek);
            console.log('firstSetRows::: ', firstSetRows)
            for (const nullPaymentRow of firstSetRows) {
                // Update payment_id and payment_date for each row
                const updatePaymentInfoQuery = `
                    UPDATE orderrecipemapping
                    SET payment_id = ?, payment_date = ?, paid_amount = ?
                    WHERE mapping_id = ?
                `;
                const paymentResult = await pool.query(updatePaymentInfoQuery,
                    [payment_id, payment_date, price, nullPaymentRow.mapping_id]);
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
                od.active_week,
                od.amount_paid,
                od.subscription_id AS stripe_customer_id,
                od.initial_payment_id,
                od.created_at,
                c.email AS customer_email,
                c.first_name AS customer_name,
                m.week,
                m.payment_id,
                m.payment_date,
                r.recipe_id,
                r.title AS recipe_name,
                r.price AS recipe_price,
                s.spice_level_id,
                s.spice_level_name,
                m.delivery_date,
                m.payment_id,
                m.payment_date,
                m.number_of_people,
                m.meals_per_week,
                m.mapping_id
            FROM orderdetails od
            JOIN customer c ON od.customer_id = c.customer_id
            LEFT JOIN orderrecipemapping m ON od.order_id = m.order_id
            LEFT JOIN recipes r ON m.recipe_id = r.recipe_id
            LEFT JOIN spicelevels s ON m.spice_level_id = s.spice_level_id
            WHERE od.order_id = ?
        `;
        console.log('orderId:: ', orderId)
        const [rows] = await pool.query(orderQuery, [orderId]);
        if (rows.length === 0) {
            return null; // Return null if order not found
        }

        // Construct the order details object
        const orderDetails = {
            order_id: rows[0].order_id,
            customer_id: rows[0].customer_id,
            active_week: rows[0].active_week,
            amount_paid: rows[0].amount_paid,
            subscription_id: rows[0].stripe_customer_id,
            initial_payment_id: rows[0].initial_payment_id,
            created_at: rows[0].created_at,
            customer_email: rows[0].customer_email,
            customer_name: rows[0].customer_name,
            order_details: rows.map(row => ({
                week: row.week,
                payment_id: row.payment_id,
                payment_date: row.payment_date,
                delivery_date: row.delivery_date,
                number_of_people: row.number_of_people,
                meals_per_week: row.meals_per_week,
                items: [
                    {
                        mapping_id: row.mapping_id,
                        recipe_id: row.recipe_id,
                        recipe_name: row.recipe_name,
                        recipe_price: row.recipe_price,
                        spice_level_id: row.spice_level_id,
                        spice_level_name: row.spice_level_name
                    }
                ]
            }))
        };

        // Merge items with same week into single object
        const mergedOrderDetails = [];
        orderDetails.order_details.forEach(detail => {
            const foundIndex = mergedOrderDetails.findIndex(item => item.week === detail.week);
            if (foundIndex !== -1) {
                mergedOrderDetails[foundIndex].items.push(detail.items[0]);
            } else {
                mergedOrderDetails.push(detail);
            }
        });
        // Update order details with merged items
        orderDetails.order_details = mergedOrderDetails;


        return orderDetails; // Return order details object
    } catch (error) {
        console.error('Error retrieving order details:', error);
        throw error; // Rethrow error to be caught by the caller
    }
};


// Endpoint handler to get order details by order ID
export const getOrderDetailsEndpoint = async (req, res) => {
    try {
        console.log('getOrderDetailsEndpoint: ', req.body.orderId)
        const orderDetails = await getOrderDetails(req.body.orderId);
        await sendEmail('handlebars/newOrderTemplate.hbs', 'New Order Received', {orderID: '123', customerName: 'John Doe'});

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
 *  Update Order
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const updateOrder = async (req, res) => {

    try {
        const {order_details, order_id} = req.body;
        console.log('order_id:', order_id)
        let latestPaidOrder = null;
        let dueOrder = null;
        order_details.forEach(order => {
            if (order.payment_id) {
                latestPaidOrder = order;
            } else if (!dueOrder) {
                dueOrder = order;
            }
        });

        const response = {
            latestPaidOrder,
            dueOrder,
            order_details
        };

        if (latestPaidOrder && latestPaidOrder.week === 1) {
            await updateFirstWeekMapping(latestPaidOrder, order_id);
        }

        // Check if meals_per_week is different between latestPaidOrder and dueOrder
        if (latestPaidOrder && dueOrder && latestPaidOrder.meals_per_week !== dueOrder.meals_per_week) {
            // Make the function call here
            await updateStripeSubscription(54);
        }
        console.log('----------Order details Week----------')
        for (const order of order_details) {
            console.log('-----week: ', order.week, ' ---------')
            await updateMappingDetails(order, order_id);
        }
        const updatedOrderDetails = await getOrderDetails(order_id);
        return successResponseWithData(res, 'Order details retrieved successfully', updatedOrderDetails);
    } catch (error) {
        console.error('Error retrieving order details:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};
const updateFirstWeekMapping = async (order, order_id) => {
    console.log('updateFirstWeekMapping')
    const {items, ...otherDetails} = order;
    const existingMappingsQuery = `
        SELECT *
        FROM orderrecipemapping
        WHERE order_id = ? AND week = ?
    `;

    for (const existingMapping of items) {
        await updateMapping(existingMapping, otherDetails);
    }
}

// Function to update mapping details for a given order
const updateMappingDetails = async (order, order_id) => {
    if (!order) return; // If no order provided, return
    console.log('----updateMappingDetails-----')
    const {items, ...otherDetails} = order;
    const date = new Date(otherDetails.delivery_date);
    otherDetails.delivery_date = date.toISOString().slice(0, 19).replace('T', ' ');
    // Fetch existing mappings for the given order_id
    const existingMappingsQuery = `
        SELECT *
        FROM orderrecipemapping
        WHERE order_id = ? AND week = ?
    `;
    const [existingMappingsRows] = await pool.query(existingMappingsQuery, [order_id, otherDetails.week]);
    // Array to store the mapping IDs that are present in the current order
    const currentMappingIds = items.map(item => item.mapping_id);


    for (const item of items) {
        const existingMapping = existingMappingsRows.find(row => row.mapping_id === item.mapping_id);
        if (!existingMapping) {
            console.log('Needs to add items in db --- meals_per_week: ', otherDetails.meals_per_week, ' , items: ', existingMappingsRows[0].meals_per_week, '+++++++++')
            // Mapping doesn't exist in the database, insert it
            await insertMapping({...item, order_id, otherDetails});
        }
    }
    for (const existingMapping of existingMappingsRows) {
        const {mapping_id} = existingMapping;
        if (!currentMappingIds.includes(mapping_id)) {
            // Mapping exists in the database but not in the current order payload, delete it
            console.log('Needs to remove items   in db --- meals_per_week: ', otherDetails.meals_per_week, ' , items: ', existingMappingsRows[0].meals_per_week, '---------')
            await deleteMapping(mapping_id);
        }
    }
    for (const existingMapping of items) {
        await updateMapping(existingMapping, otherDetails);
    }
};

// Function to insert a new mapping
const insertMapping = async (mapping) => {
    console.log('Insert Mapping Case.')
    const insertMappingQuery = `
        INSERT INTO orderrecipemapping ( recipe_id, recipe_price, spice_level_id, order_id, week,
        delivery_date, number_of_people, meals_per_week)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.query(insertMappingQuery, [mapping.recipe_id, mapping.recipe_price, mapping.spice_level_id, mapping.order_id,
        mapping.otherDetails.week, mapping.otherDetails.delivery_date, mapping.otherDetails.number_of_people, mapping.otherDetails.meals_per_week]);

    console.log(`New order recipe mapping inserted successfully for mapping ID: ${mapping.mapping_id}`);
};

// Function to update an existing mapping
const updateMapping = async (mapping, otherDetails) => {
    console.log('Update Mapping Case.')
    console.log('otherDetails:', otherDetails)
    console.log('mapping:', mapping)
    if (!mapping.mapping_id) {
        console.log('Found Mapping Id null')
    }
    const updateMappingQuery = `
        UPDATE orderrecipemapping
        SET spice_level_id = ?, recipe_id = ?, recipe_price = ?,  number_of_people = ?, meals_per_week = ?
        WHERE mapping_id = ?
    `;
    const [result] = await pool.query(updateMappingQuery, [mapping.spice_level_id, mapping.recipe_id, mapping.recipe_price,
        otherDetails.number_of_people, otherDetails.meals_per_week, mapping.mapping_id]);
    console.log(`Order recipe mapping updated successfully for mapping ID: ${mapping.mapping_id}`);
};

// Function to delete a mapping
const deleteMapping = async (mapping_id) => {
    console.log('Delete Mapping Case.')
    const deleteMappingQuery = `
        DELETE FROM orderrecipemapping
        WHERE mapping_id = ?
    `;
    await pool.query(deleteMappingQuery, [mapping_id]);

    console.log(`Mapping removed from orderrecipemapping for mapping ID: ${mapping_id}`);
};

// Define your function here
const updateStripeSubscription = async (parameters) => {
    console.log('updateStripeSubscription')
    // Function logic here
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
                mapping_id: row.mapping_id,
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

