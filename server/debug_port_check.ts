import * as net from 'net';

const HOST = '192.168.1.201';
const PORT = 4370;

const socket = new net.Socket();
socket.setTimeout(5000);

console.log(`[DEBUG] Attempting TCP connection to ${HOST}:${PORT}...`);

socket.connect(PORT, HOST, () => {
    console.log('[DEBUG] TCP Connection ESTABLISHED!');
    socket.destroy();
});

socket.on('error', (err) => {
    console.error(`[DEBUG] Connection Error: ${err.message}`);
});

socket.on('timeout', () => {
    console.error('[DEBUG] Connection Timed Out');
    socket.destroy();
});
