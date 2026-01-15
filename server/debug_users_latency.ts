import ZKLib from 'zkteco-js';

const IP = '192.168.1.201';
const PORT = 4370;
const TIMEOUT = 40000; // Increased to 40s for this test
const INPORT = 4000;

async function runTest() {
    console.log(`[DEBUG] Starting Latency Test... Target: ${IP}`);
    const zk = new ZKLib(IP, PORT, TIMEOUT, INPORT);

    try {
        const startConnect = Date.now();
        console.log('[DEBUG] Connecting...');
        await zk.createSocket();
        const connectTime = Date.now() - startConnect;
        console.log(`[DEBUG] Connected in ${connectTime}ms`);

        const startUsers = Date.now();
        console.log('[DEBUG] Fetching Users...');
        const users = await zk.getUsers();
        const usersTime = Date.now() - startUsers;
        console.log(`[DEBUG] Fetched ${users?.data?.length} users in ${usersTime}ms`);

        console.log('[DEBUG] Disconnecting...');
        await zk.disconnect();
        console.log('[DEBUG] Disconnected.');
    } catch (e) {
        console.error('[DEBUG] Test Failed:', e);
    }
}

runTest();
