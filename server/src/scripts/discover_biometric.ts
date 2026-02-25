// @ts-ignore
import ZKLib from 'zkteco-js';
import * as net from 'net';

async function scanSubnet(subnet: string) {
    console.log(`Scanning subnet ${subnet}.x for biometric devices on port 4370...`);

    const promises = [];
    for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        promises.push(checkPort(ip, 4370, 500));
    }

    const results = await Promise.all(promises);
    const activeIps = results.filter(r => r.active).map(r => r.ip);

    if (activeIps.length === 0) {
        console.log('No devices found on port 4370 in this subnet.');
        return;
    }

    console.log(`Found ${activeIps.length} potential devices:`, activeIps);

    for (const ip of activeIps) {
        console.log(`Testing connection to ${ip}...`);
        const zk = new ZKLib(ip, 4370, 5000, 4000);
        try {
            await (zk as any).ztcp.createSocket();
            await (zk as any).ztcp.connect();
            console.log(`✅ SUCCESS: Biometric device found and connected at ${ip}`);
            const info = await zk.getDeviceInfo();
            console.log('Device Info:', info);
            await zk.disconnect();
        } catch (e: any) {
            console.log(`❌ Failed to connect to ${ip}:`, e.message);
        }
    }
}

function checkPort(ip: string, port: number, timeout: number): Promise<{ ip: string, active: boolean }> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = false;

        socket.on('connect', () => {
            status = true;
            socket.destroy();
        });

        socket.on('timeout', () => {
            socket.destroy();
        });

        socket.on('error', () => {
            socket.destroy();
        });

        socket.on('close', () => {
            resolve({ ip, active: status });
        });

        socket.setTimeout(timeout);
        socket.connect(port, ip);
    });
}

// Based on ipconfig: 192.168.29.129
scanSubnet('192.168.29');
