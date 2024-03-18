import WebSocket, {WebSocketServer} from 'ws';

const wss = new WebSocketServer({
    port: 443
});

// Function to send message to all connected clients
function sendMessageToAll(message) {
    const stringifiedMessage = JSON.stringify(message);
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(stringifiedMessage);
        }
    });
}

export {wss, sendMessageToAll};
