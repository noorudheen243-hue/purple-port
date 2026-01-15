const ZKLib = require('node-zklib');
const { COMMANDS } = require('node-zklib/constants');

// ZK Time Encoding
const encodeTime = (date) => {
    const t = date;
    const second = t.getSeconds();
    const minute = t.getMinutes();
    const hour = t.getHours();
    const day = t.getDate();
    const month = t.getMonth() + 1;
    const year = t.getFullYear() - 2000;

    return (
        (year * 12 * 31 + (month - 1) * 31 + day - 1) * (24 * 60 * 60) +
        hour * 60 * 60 +
        minute * 60 +
        second
    );
};

const testCommands = async () => {
    const ip = '192.168.1.201';
    const port = 4370;

    const zk = new ZKLib(ip, port, 5000, 4000);

    try {
        await zk.createSocket();
        console.log('[TEST] Socket created.');

        // 1. Test Set Time
        // Current Time
        const now = new Date();
        const zkTime = encodeTime(now);
        console.log(`[TEST] Setting Time to ${now.toLocaleString()} (ZKInt: ${zkTime})...`);

        // Pack into 4-byte LE buffer
        const timeBuffer = Buffer.alloc(4);
        timeBuffer.writeUInt32LE(zkTime, 0);

        const setTimeRes = await zk.executeCmd(COMMANDS.CMD_SET_TIME, timeBuffer);
        console.log('[TEST] Set Time Result:', setTimeRes);

        // 2. Test Restart (Uncomment to test actual restart)
        // console.log('[TEST] Restarting Device...');
        // const restartRes = await zk.executeCmd(COMMANDS.CMD_RESTART, '');
        // console.log('[TEST] Restart Result:', restartRes);

        await zk.disconnect();

    } catch (e) {
        console.error('[TEST] Failed:', e);
    }
};

testCommands();
