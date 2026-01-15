import ZKLib from 'zkteco-js';

const IP = '192.168.1.201';
const PORT = 4370;
const TIMEOUT = 20000;
const INPORT = 4000;

async function runTest() {
    console.log(`[DEBUG] Starting cycles... Target: ${IP}`);
    const zk = new ZKLib(IP, PORT, TIMEOUT, INPORT);

    // Cycle 1
    console.log('\n[DEBUG] --- Cycle 1 ---');
    try {
        console.log('[DEBUG] Calling createSocket()...');
        await zk.createSocket();
        console.log('[DEBUG] Connected.');

        console.log('[DEBUG] Getting Name...');
        const name = await zk.getDeviceName();
        console.log(`[DEBUG] Name: ${name}`);

        console.log('[DEBUG] Getting Serial...');
        const serial = await zk.getSerialNumber();
        console.log(`[DEBUG] Serial: ${serial}`);

        console.log('[DEBUG] Getting Firmware...');
        const firmware = await zk.getFirmware();
        console.log(`[DEBUG] Firmware: ${firmware}`);

        console.log('[DEBUG] Getting Platform...');
        const platform = await zk.getPlatform();
        console.log(`[DEBUG] Platform: ${platform}`);

        console.log('[DEBUG] Getting Time...');
        const time = await zk.getTime();
        console.log(`[DEBUG] Time: ${time}`);

        console.log('[DEBUG] Getting User Count...');
        const users = await zk.getUser(); // or getUsers()
        console.log(`[DEBUG] User Count: ${users?.data?.length}`);

        console.log('[DEBUG] Disconnecting...');
        await zk.disconnect();
        console.log('[DEBUG] Disconnected.');
    } catch (e) {
        console.error('[DEBUG] Cycle 1 Failed:', e);
    }

    // Cycle 2 (Immediate Retry)
    console.log('\n[DEBUG] --- Cycle 2 (Immediate) ---');
    try {
        console.log('[DEBUG] Calling createSocket()...');
        await zk.createSocket();
        console.log('[DEBUG] Connected.');

        console.log('[DEBUG] Getting Serial...');
        const serial = await zk.getSerialNumber();
        console.log(`[DEBUG] Serial: ${serial}`);

        console.log('[DEBUG] Disconnecting...');
        await zk.disconnect();
        console.log('[DEBUG] Disconnected.');
    } catch (e: any) {
        console.error('[DEBUG] Cycle 2 Failed:', e);
        if (e && e.buffer) console.log('[DEBUG] Error Buffer:', e.buffer.toString('hex'));
    }
}

runTest();
