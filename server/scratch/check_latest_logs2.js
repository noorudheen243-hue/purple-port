const ZKLib = require('zkteco-js');

async function main() {
    let zk = new ZKLib('192.168.1.201', 4370, 5000, 4000);
    try {
        await zk.createSocket();
        await zk.connect();
        
        const logsData = await zk.getAttendances();
        const logs = logsData?.data || [];
        
        console.log(`Total logs: ${logs.length}`);
        
        // Sort by record_time descending (or recordTime if it's there)
        logs.sort((a, b) => {
            const timeA = a.record_time || a.recordTime;
            const timeB = b.record_time || b.recordTime;
            return new Date(timeB).getTime() - new Date(timeA).getTime();
        });
        
        console.log("Latest 10 logs:", logs.slice(0, 10));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await zk.disconnect();
    }
}
main();
