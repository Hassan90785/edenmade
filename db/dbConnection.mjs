// dbConnection.js

import mysql from 'mysql2/promise'; // Import mysql2 with Promise-based API
import dbConfig from '../config/config.mjs';

// Create a MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Export the pool to be used in other files
export default pool;
