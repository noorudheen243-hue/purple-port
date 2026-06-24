const ZKLib = require('node-zklib');

async function test() {
    const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000);
    try {
        await zk.createSocket();
        console.log('Connected');
        const logs = await zk.getAttendances();
        console.log('Logs structure:', logs.data.slice(0, 2));
    } catch(e) {
        console.error(e);
    } finally {
        await zk.disconnect();
    }
}
test();
