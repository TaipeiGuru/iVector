// server.js
const express = require('express');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const path = require('path'); // Add this line

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const sessions = {}; // sessionCode => [WebSocket]

// --- NEW: Serve static files from the 'public' directory ---
app.use(express.static(path.join(__dirname, 'public'))); 
// If 'server.js' is at the root, and 'public' is at the root, use path.join(__dirname, 'public')
// If 'server.js' is in a 'server/' folder and 'public/' is at the root, you'd use path.join(__dirname, '../public')
// Based on your current file list, assuming server.js is at the root level, and you create a 'public' folder at the root.

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        const msg = JSON.parse(data);

        switch (msg.type) {
            case 'create_session':
                const sessionCode = uuidv4().slice(0, 6).toUpperCase();
                sessions[sessionCode] = [ws];
                ws.sessionCode = sessionCode;
                ws.send(JSON.stringify({ type: 'session_created', sessionCode }));
                break;

            case 'join_session':
                if (sessions[msg.sessionCode]) {
                    sessions[msg.sessionCode].push(ws);
                    ws.sessionCode = msg.sessionCode;
                    ws.send(JSON.stringify({ type: 'session_joined', sessionCode: msg.sessionCode }));
                    sessions[msg.sessionCode].forEach(client => {
                        if (client !== ws) {
                            client.send(JSON.stringify({ type: 'peer_joined' }));
                        }
                    });
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid session code' }));
                }
                break;

            case 'game_state':
                const others = sessions[ws.sessionCode]?.filter(client => client !== ws);
                if (others) {
                    others.forEach(client =>
                        client.send(JSON.stringify({ type: 'game_state', state: msg.state }))
                    );
                }
                break;
            case 'terrain_change':
                const sessionClients = sessions[ws.sessionCode];
                if (sessionClients) {
                    sessionClients.forEach(client => {
                        if (client !== ws && client.readyState === 1) { // 1 = OPEN
                            client.send(JSON.stringify({ type: 'terrain_change', terrain: msg.terrain }));
                        }
                    });
                }
                break;
            case 'end_session':
                const endSessionClients = sessions[ws.sessionCode];
                if (endSessionClients) {
                    endSessionClients.forEach(client => {
                        if (client.readyState === 1) { // 1 = OPEN
                            client.send(JSON.stringify({ type: 'end_session', value: msg.value }));
                        }
                    });
                }
                break;
        }
    });

    ws.on('close', () => {
        const session = sessions[ws.sessionCode];
        if (session) {
            sessions[ws.sessionCode] = session.filter(client => client !== ws);
            if (sessions[ws.sessionCode].length === 0) {
                delete sessions[ws.sessionCode];
            }
        }
    });
});

// --- MODIFIED: Listen on Render's dynamic PORT ---
const PORT = process.env.PORT || 3000; // Render sets the PORT env variable
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// --- NEW: Basic Health Check Endpoint (Recommended for Render Web Services) ---
app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

// --- Optional: Graceful Shutdown ---
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('HTTP server closed.');
        wss.clients.forEach(ws => ws.close(1001, 'Server going down')); // 1001: Going Away
        console.log('WebSocket clients disconnected.');
        process.exit(0);
    });
});