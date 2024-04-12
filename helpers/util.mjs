import pool from "../db/dbConnection.mjs";

/**
 * Get Paid Order
 * @param order_id
 * @returns {Promise<*|null>}
 */
export const getLastPaidMapping = async (order_id) => {
    try {
        const query = `
            SELECT *
            FROM orderrecipemapping
            WHERE payment_id is not null and order_id=?
            ORDER BY week DESC
            LIMIT 1
        `;
        const [result] = await pool.query(query, [order_id]);
        if (result.length > 0) {
            return result[0];
        } else {
            return null; // No order found
        }
    } catch (error) {
        console.error('Error fetching Last Paid Mapping:', error);
        throw error;
    }
};
/**
 * Get Due Order
 * @param order_id
 * @returns {Promise<*|null>}
 */

export const getDueMapping = async (order_id) => {
    try {
        const query = `
            SELECT *
            FROM orderrecipemapping
            WHERE payment_id is  null and order_id=?
            ORDER BY week ASC
            LIMIT 1
        `;
        const [result] = await pool.query(query, [order_id]);
        if (result.length > 0) {
            return result[0];
        } else {
            return null; // No order found
        }
    } catch (error) {
        console.error('Error fetching Due Mapping:', error);
        throw error;
    }
};
