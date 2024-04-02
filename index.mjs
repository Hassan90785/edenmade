// index.mjs
import apiRouter from "./routes/api.router.mjs";
import express, {json} from "express";
import pool from "./db/dbConnection.mjs";
import cors from "cors";
import * as StripeController from "./controllers/stripe.controller.mjs";
import {sendMessageToAll, wss} from "./controllers/websocket.controller.mjs";
import {publish} from "./helpers/pubsub.mjs";

const app = express();
app.use((req, res, next) => {
    if (req.originalUrl === '/api/stripe/webhook') {
        next();
    } else {
        json()(req, res, next);
    }
});

app.use(cors());
app.use('/api', apiRouter);

app.post("/api/stripe/webhook", express.raw({type: 'application/json'}), StripeController.stripe_webhook);
pool.getConnection()
    .then(connection => {
        console.log('DB is connected');
        connection.release(); // Release the connection back to the pool
    })
    .catch(err => {
        console.error('Error connecting to database:', err);
        process.exit(1); // Exit the process if unable to connect to the database
    });

// Event listener for WebSocket connections
wss.on('connection', function connection(ws) {
    console.log('Client connected');

    // Event listener for incoming messages from clients
    ws.on('message', function incoming(message) {
        console.log('Received message from client:', message);
        publish('ws_message', message);
    });

    // Event listener for WebSocket disconnections
    ws.on('close', function close() {
        console.log('Client disconnected');
    });
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
const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
