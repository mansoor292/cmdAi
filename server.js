const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const os = require('os');
const pty = require('node-pty');

// Serve static files
app.use(express.static('public'));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected');

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    
    // Create terminal
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env
    });

    // Handle incoming data from client
    socket.on('input', (data) => {
        ptyProcess.write(data);
    });

    // Send terminal output to client
    ptyProcess.on('data', (data) => {
        socket.emit('output', data);
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
        ptyProcess.kill();
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
