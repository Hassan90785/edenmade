// pubsub.js

import { EventEmitter } from 'events';

// Create an event emitter instance
const eventEmitter = new EventEmitter();

// Function to subscribe to a specific event
export function subscribe(eventName, callback) {
    eventEmitter.on(eventName, callback);
}

// Function to publish a message to a specific event
export function publish(eventName, data) {
    eventEmitter.emit(eventName, data);
}
