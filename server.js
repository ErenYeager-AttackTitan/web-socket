const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 8080 });
const rooms = {}; // Store room data

wss.on('connection', (ws) => {
    let roomId = null;
    let isAdmin = false;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.action === 'create') {
            roomId = uuidv4();
            rooms[roomId] = { admin: ws, users: [ws], m3u8: null, adminTime: 0 };
            ws.send(JSON.stringify({ action: 'room_created', roomId }));
            isAdmin = true;
        } else if (data.action === 'join' && rooms[data.roomId]) {
            roomId = data.roomId;
            rooms[roomId].users.push(ws);
            ws.send(JSON.stringify({ action: 'stream', m3u8: rooms[roomId].m3u8, adminTime: rooms[roomId].adminTime }));
        } else if (data.action === 'update_stream' && isAdmin && rooms[roomId]) {
            rooms[roomId].m3u8 = data.m3u8;
            rooms[roomId].adminTime = 0;
            rooms[roomId].users.forEach(user => user.send(JSON.stringify({ action: 'stream', m3u8: data.m3u8, adminTime: 0 })));
        } else if (data.action === 'update_time' && isAdmin && rooms[roomId]) {
            rooms[roomId].adminTime = data.currentTime;
            rooms[roomId].users.forEach(user => {
                if (user !== ws) user.send(JSON.stringify({ action: 'sync_time', adminTime: data.currentTime }));
            });
        }
    });

    ws.on('close', () => {
        if (roomId && rooms[roomId]) {
            rooms[roomId].users = rooms[roomId].users.filter(user => user !== ws);
            if (rooms[roomId].users.length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

console.log('WebSocket server running on ws://localhost:8080');
                                        
