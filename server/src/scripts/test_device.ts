// @ts-ignore
import ZKLib from 'zkteco-js';

const DEVICE_IP = '192.168.1.201';
const DEVICE_PORT = 4370;

async function testConnection() {
    console.log('=== Biometric Device Connection Test ===');
    console.log(`Target: ${DEVICE_IP}:${DEVICE_PORT}`);
    console.log('');

    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);

    try {
        console.log('[1/4] Creating socket...');
        await (zk as any).ztcp.createSocket();
        console.log('✓ Socket created');

        console.log('[2/4] Attempting TCP connection...');
        await (zk as any).ztcp.connect();
        console.log('✓ TCP connected');

        (zk as any).connectionType = 'tcp';

        console.log('[3/4] Fetching device info...');
        const deviceName = await zk.getDeviceName();
        console.log(`✓ Device Name: ${deviceName}`);

        console.log('[4/4] Fetching attendance logs...');
        const logs = await zk.getAttendances();
        console.log(`✓ Found ${logs?.data?.length || 0} logs`);

        console.log('');
        console.log('=== CONNECTION SUCCESSFUL ===');

        await zk.disconnect();
        process.exit(0);
    } catch (error: any) {
        console.error('');
        console.error('=== CONNECTION FAILED ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);

        try { await zk.disconnect(); } catch (e) { }
        process.exit(1);
    }
}

testConnection();
