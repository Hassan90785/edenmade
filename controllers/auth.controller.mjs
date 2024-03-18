import {ErrorResponse, successResponseWithData} from "../helpers/apiresponse.mjs";
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
        const [userResults] = await pool.query('INSERT INTO customer (email, password) VALUES (?, ?)', [email, hashedPassword]);
        const customerId = userResults.insertId;
        const [newlyAddedUser] = await pool.query('SELECT * FROM customer WHERE customer_id = ?', [customerId]);
        // Return a success response
        return successResponseWithData(res, 'User registered successfully', newlyAddedUser[0]);
    } catch (error) {
        console.error('Error during sign-up:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};

/**
 *  Update customer details
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const updateCustomerDetails = async (req, res) => {
    const {
        customer_id,
        first_name,
        last_name,
        address,
        phone_number,
        city,
        postal_code,
    } = req.body;

    try {
        // Assuming you have a table named 'user_details' where these details are stored
        // You would need to adapt this SQL query based on your database schema
        const updateQuery = `
            UPDATE customer 
            SET 
                first_name = ?, 
                last_name = ?, 
                address = ?, 
                phone_number = ?, 
                city = ?, 
                postal_code = ?
            WHERE customer_id = ?`;

        // Execute the query with the provided parameters
        await pool.query(updateQuery, [
            first_name,
            last_name,
            address,
            phone_number,
            city,
            postal_code,
            customer_id // Assuming you have the user's ID available in the request
        ]);
        const [updatedCustomer] = await pool.query('SELECT * FROM customer WHERE customer_id = ?', [customer_id]);
        // Return a success response
        return successResponseWithData(res, 'Customer details updated successfully', updatedCustomer[0]);
    } catch (error) {
        console.error('Error updating user details:', error);
        return ErrorResponse(res, 'Internal Server Error');
    }
};
