const ZKLib = require('node-zklib');

const testConnection = async () => {
    const ip = '192.168.1.201';
    const port = 4370;

    console.log(`[TEST] Attempting connection to ${ip}:${port}...`);

    const zk = new ZKLib(ip, port, 5000, 4000);

    try {
        // Try to create socket
        await zk.createSocket();
        console.log('[TEST] Socket created successfully.');

        // Get Info
        console.log('[TEST] Fetching Serial Number...');
        const serial = await zk.getSerialNumber();
        console.log(`[TEST] Serial: ${serial}`);

        console.log('[TEST] Fetching Users...');
        const users = await zk.getUsers();
        console.log(`[TEST] Users Count: ${users?.data?.length || users?.length || 0}`);

        console.log('[TEST] Disconnecting...');
        await zk.disconnect();
        console.log('[TEST] Disconnected cleanly.');

    } catch (e) {
        console.error('[TEST] Connection Failed:', e);
    }
};

testConnection();
