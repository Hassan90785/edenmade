import {ErrorResponse, successResponse} from "../helpers/apiresponse.mjs";
import pool from "../db/dbConnection.mjs";
import bcrypt from 'bcrypt'; // Import bcrypt for password hashing
/**
 * Login
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const login = async (req, res) => {
    const {username, password} = req.body;

    try {
        // Query the database to check if the user exists and the password matches
        const [rows, fields] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);

        // If no user found or password doesn't match, return an error response
        if (rows.length === 0) {
            return ErrorResponse(res, 'Invalid username or password');
        }

        // If authentication successful, return a success response
        return successResponse(res, 'Login successful');
    } catch (error) {
        console.error('Error during login:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};


/**
 * Sign up
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const signUp = async (req, res) => {
    const {username, password} = req.body;

    try {
        // Check if the username already exists in the database
        const [existingUsers, _] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

        // If the username already exists, return an error response
        if (existingUsers.length > 0) {
            return ErrorResponse(res, 'Username already exists');
        }

        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds: 10

        // Insert the new user into the database with the hashed password
        await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

        // Return a success response
        return successResponse(res, 'User registered successfully');
    } catch (error) {
        console.error('Error during sign-up:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};
