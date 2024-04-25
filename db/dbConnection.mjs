// dbConnection.js

import mysql from 'mysql2/promise';
import {dbConfig} from "../config/config.mjs"; // Import mysql2 with Promise-based API

// Create a MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Export the pool to be used in other files
export default pool;
