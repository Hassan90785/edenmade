import pool from "../db/dbConnection.mjs";

/**
 * Get Customer by Email
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const getCustomerByEmail = async (req, res) => {
    const {email} = req;

    try {
        // Query the database to retrieve the user by username
        const [rows] = await pool.query('SELECT * FROM customer WHERE email = ?', [email]);

        // Check if user exists
        if (rows.length === 0) {
            console.log('Email not registered! : ', email);
            return null;
        }

        // Passwords match, authentication successful
        return rows[0];
    } catch (error) {
        console.log('Could not fetch customer by email! : ', error);
        return null;
    }
};

