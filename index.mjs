// index.mjs
import apiRouter from "./routes/api.router.mjs";
import express, {json} from "express";
import pool from "./db/dbConnection.mjs";
import cors from "cors";

const app = express();
app.use(json());
app.use(cors());
app.use('/api', apiRouter);

pool.getConnection()
    .then(connection => {
        console.log('DB is connected');
        connection.release(); // Release the connection back to the pool
    })
    .catch(err => {
        console.error('Error connecting to database:', err);
        process.exit(1); // Exit the process if unable to connect to the database
    });


// Close the connection pool when the process receives a termination signal (e.g., SIGINT)
process.on('SIGINT', () => {
    console.log('Received SIGINT. Closing database connection pool...');
    pool.end((err) => {
        if (err) {
            console.error('Error closing database connection pool:', err);
        } else {
            console.log('Database connection pool closed.');
        }
        process.exit();
    });
});

// Start the Express server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
