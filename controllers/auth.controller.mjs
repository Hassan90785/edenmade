import {ErrorResponse, successResponse, successResponseWithData} from "../helpers/apiresponse.mjs";
import pool from "../db/dbConnection.mjs";
import bcrypt from 'bcrypt'; // Import bcrypt for password hashing
/**
 * Login
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const login = async (req, res) => {
    const {email, password} = req.body;

    try {
        // Query the database to retrieve the user by username
        const [rows] = await pool.query('SELECT * FROM customer WHERE email = ?', [email]);

        // Check if user exists
        if (rows.length === 0) {
            return ErrorResponse(res, 'Invalid email or password');
        }

        // Compare hashed passwords
        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        // If passwords don't match, return an error response
        if (!passwordMatch) {
            return ErrorResponse(res, 'Invalid username or password');
        }

        // Passwords match, authentication successful
        return successResponseWithData(res, 'Login successful', user);
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
    const {email, password} = req.body;

    try {
        // Check if the username already exists in the database
        const [existingUsers, _] = await pool.query('SELECT * FROM customer WHERE email = ?', [email]);

        // If the username already exists, return an error response
        if (existingUsers.length > 0) {
            return ErrorResponse(res, 'Username already exists');
        }
        console.log('username: ', email)
        console.log('password: ', password)
        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds: 10

        // Insert the new user into the database with the hashed password
        await pool.query('INSERT INTO customer (email, password) VALUES (?, ?)', [email, hashedPassword]);

        // Return a success response
        return successResponse(res, 'User registered successfully');
    } catch (error) {
        console.error('Error during sign-up:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};
