// server.js
const express = require('express');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const sessions = {}; // sessionCode => [WebSocket]

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

server.listen(3000, () => {
    console.log('WebSocket server listening on port 3000');
});
