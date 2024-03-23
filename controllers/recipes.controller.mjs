import { ErrorResponse, successResponseWithData } from "../helpers/apiresponse.mjs";
import pool from "../db/dbConnection.mjs";

/**
 * Get all recipes
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const getAllRecipes = async (req, res) => {
    try {
        // Query the database to retrieve all recipes with category names
        const query = `
            SELECT recipes.*, categories.category_name
            FROM recipes
            INNER JOIN categories ON recipes.category_id = categories.category_id
        `;
        const [rows] = await pool.query(query);

        // Return success response with data
        return successResponseWithData(res, 'All recipes retrieved successfully', rows);
    } catch (error) {
        console.error('Error retrieving all recipes:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};

/**
 * Get recipes by category
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const getRecipesByCategory = async (req, res) => {
    const categoryId = req.params.categoryId; // Assuming category ID is passed as a URL parameter

    try {
        // Query the database to retrieve recipes by category with category name
        const query = `
            SELECT recipes.*, categories.category_name
            FROM recipes
            INNER JOIN categories ON recipes.category_id = categories.category_id
            WHERE recipes.category_id = ?
        `;
        const [rows] = await pool.query(query, [categoryId]);

        // Return success response with data
        return successResponseWithData(res, 'Recipes retrieved by category successfully', rows);
    } catch (error) {
        console.error('Error retrieving recipes by category:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};
