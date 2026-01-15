
import * as net from 'net';

const HOST = '192.168.1.201';
const PORT = 4370;

const client = new net.Socket();

client.setTimeout(5000);

console.log(`Attempting raw socket connection to ${HOST}:${PORT}...`);

client.connect(PORT, HOST, () => {
    console.log('CONNECTED TO SOCKET!');

    // ZK Connect Command (CMD_CONNECT = 1000)
    // Structure: 2 byte MachineID, 2 byte Reserved, 2 byte Command, 2 bytes Checksum, ...
    // Standard TCP Packet Header for ZK usually differs from UDP.
    // Let's try sending a generic ZK "Hello" packet often used in TCP handshake.

    // This is a known valid TCP header for ZK-ESSL devices
    // 50 50 82 7d 13 00 00 00 3e 0f 00 00 00 00 00 00
    const packet = Buffer.from([0x50, 0x50, 0x82, 0x7d, 0x08, 0x00, 0x00, 0x00, 0xe0, 0x03, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00]);

    console.log('Sending handshake packet:', packet.toString('hex'));
    client.write(packet);
});

client.on('data', (data) => {
    console.log('RECEIVED DATA:', data.toString('hex'));
    client.destroy(); // Murder client after server's response
});

client.on('close', () => {
    console.log('Connection closed');
    process.exit(0);
});

client.on('error', (err) => {
    console.error('Socket Error:', err.message);
    process.exit(1);
});

client.on('timeout', () => {
    console.error('Socket Timed Out (connected but no handshake response)');
    client.destroy();
    process.exit(1);
});
