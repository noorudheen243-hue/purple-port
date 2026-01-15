const ZKLib = require('node-zklib');

const testConnection = async () => {
    const ip = '192.168.1.201';
    const port = 4370;

    console.log(`[TEST] Attempting connection to ${ip}:${port}...`);

    // Try without timeout args first, or default
    const zk = new ZKLib(ip, port, 10000, 4000);

    try {
        // Try to create socket
        await zk.createSocket();
        console.log('[TEST] Socket created successfully.');

        // Inspect available methods
        console.log('[TEST] ZK Instance Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(zk)));

        // Get Info
        console.log('[TEST] Fetching Info...');
        try {
            const info = await zk.getInfo();
            console.log('[TEST] Info:', info);
        } catch (e) { console.log('[TEST] getInfo failed:', e); }

        console.log('[TEST] Fetching Users...');
        const users = await zk.getUsers();
        // console.log('Users raw:', users);
        const count = users && users.data ? users.data.length : (Array.isArray(users) ? users.length : 0);
        console.log(`[TEST] Users Count: ${count}`);

        console.log('[TEST] Disconnecting...');
        await zk.disconnect();
        console.log('[TEST] Disconnected cleanly.');

    } catch (e) {
        console.error('[TEST] Connection Failed:', e);
    }
};

testConnection();
