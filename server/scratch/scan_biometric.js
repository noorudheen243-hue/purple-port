const net = require('net');

async function scan() {
    console.log("Scanning 192.168.1.0/24 for port 4370...");
    for (let i = 1; i <= 254; i++) {
        const ip = `192.168.1.${i}`;
        const socket = new net.Socket();
        socket.setTimeout(200);
        socket.on('connect', () => {
            console.log(`[FOUND] Biometric device at ${ip}`);
            socket.destroy();
        });
        socket.on('timeout', () => socket.destroy());
        socket.on('error', () => socket.destroy());
        socket.connect(4370, ip);
    }
}
scan();
