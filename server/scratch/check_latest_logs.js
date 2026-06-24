const ZKLib = require('zkteco-js');

async function main() {
    let zk = new ZKLib('192.168.1.201', 4370, 5000, 4000);
    try {
        await zk.createSocket();
        await zk.connect();
        
        const time = await zk.getTime();
        console.log("Device Time:", time);
        
        const logsData = await zk.getAttendances();
        const logs = logsData?.data || [];
        
        console.log(`Total logs: ${logs.length}`);
        
        // Sort by recordTime descending
        logs.sort((a, b) => new Date(b.recordTime).getTime() - new Date(a.recordTime).getTime());
        
        console.log("Latest 5 logs:", logs.slice(0, 5));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await zk.disconnect();
    }
}
main();
