import pool from "../db/dbConnection.mjs";

/**
 * Get Customer Id
 * @returns {Promise<*|null>}
 * @param email
 */
export const getCustomerId = async (email) => {
    try {
        const query = `
            SELECT customer_id
            FROM customer
            WHERE email = ?
            LIMIT 1
        `;
        const [result] = await pool.query(query, [email]);
        if (result.length > 0) {
            return result[0];
        } else {
            console.log('No Customer Found against Customer Email :', email);
            return null; // No order found
        }
    } catch (error) {
        console.error('Error fetching Customer ID against Customer Email:', error);
        throw error;
    }
};

/**
 * Get Order Id
 * @returns {Promise<*|null>}
 * @param customerId
 */
export const getOrderId = async (customerId) => {
    try {
        const {customer_id} = customerId;
        const query = `
            SELECT order_id, active_week
            FROM orderdetails
            WHERE customer_id = ?
            order by order_id desc
            LIMIT 1
        `;
        const [result] = await pool.query(query, [customer_id]);
        if (result.length > 0) {
            return result[0];
        } else {
            console.log('No Order Found against Customer ID:', customer_id);
            return null; // No order found
        }
    } catch (error) {
        console.error('Error fetching Order ID against Customer Id:', error);
        throw error;
    }
};
