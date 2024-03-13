import { ErrorResponse, successResponseWithData } from "../helpers/apiresponse.mjs";
import pool from "../db/dbConnection.mjs";

/**
 * Get all categories
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const getAllCategories = async (req, res) => {
    try {
        // Query the database to retrieve all categories
        const query = `
            SELECT *
            FROM categories
        `;
        const [rows] = await pool.query(query);

        // Return success response with data
        return successResponseWithData(res, 'All categories retrieved successfully', rows);
    } catch (error) {
        console.error('Error retrieving all categories:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};
