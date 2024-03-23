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
/**
 * getAllCategoriesWithRecipes
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const getAllCategoriesWithRecipes = async (req, res) => {
    try {
        // Query the database to retrieve all categories with their associated recipes
        const query = `
            SELECT c.category_id, 
                   c.category_name, 
                   r.recipe_id, 
                   r.title , 
                   r.price , 
                   r.image_url 
            FROM categories c
            LEFT JOIN recipes r ON c.category_id = r.category_id
        `;
        const [rows] = await pool.query(query);

        // Transforming the result into the desired format
        const categoriesWithRecipes = rows.reduce((acc, row) => {
            const existingCategory = acc.find(cat => cat.category_id === row.category_id);
            if (existingCategory) {
                existingCategory.recipes.push({
                    recipe_id: row.recipe_id,
                    title: row.title,
                    category_name: row.category_name,
                    price: row.price,
                    image_url: row.image_url
                });
            } else {
                acc.push({
                    category_id: row.category_id,
                    category_name: row.category_name,
                    recipes: [{
                        recipe_id: row.recipe_id,
                        title: row.title,
                        category_name: row.category_name,
                        price: row.price,
                        image_url: row.image_url
                    }]
                });
            }
            return acc;
        }, []);

        // Return success response with data
        return successResponseWithData(res, 'All categories with recipes retrieved successfully', categoriesWithRecipes);
    } catch (error) {
        console.error('Error retrieving all categories with recipes:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};
