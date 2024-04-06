
import { ErrorResponse, successResponseWithData } from "../helpers/apiresponse.mjs";
import pool from "../db/dbConnection.mjs";

/**
 * Get all Spice levels
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const getAllSpices = async (req, res) => {
    try {
        // Query the database to retrieve all categories
        const query = `
            SELECT *
            FROM spicelevels
        `;
        const [rows] = await pool.query(query);

        // Return success response with data
        return successResponseWithData(res, 'All Spice Levels retrieved successfully', rows);
    } catch (error) {
        console.error('Error retrieving all Spice Levels :', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};
