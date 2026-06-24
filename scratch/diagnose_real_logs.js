const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH connection established!');
    
    const nodeScript = `
// @ts-ignore
import ZKLib from 'zkteco-js';

async function main() {
    console.log("Connecting to device to diagnose logs...");
    const zk = new ZKLib('223.181.8.251', 4370, 10000, 4000);
    try {
        await (zk as any).ztcp.createSocket();
        await (zk as any).ztcp.connect();
        const response = await zk.getAttendances();
        const logs = response && response.data ? response.data : [];
        console.log("Total logs fetched:", logs.length);
        if (logs.length > 0) {
            for (let i = 0; i < Math.min(5, logs.length); i++) {
                const log = logs[i];
                console.log("Log " + i + ":");
                console.log("  deviceUserId:", log.deviceUserId);
                console.log("  recordTime:", log.recordTime);
                console.log("  recordTime type:", typeof log.recordTime);
                console.log("  recordTime instanceof Date:", log.recordTime instanceof Date);
                if (log.recordTime instanceof Date) {
                    console.log("  recordTime getTime:", log.recordTime.getTime());
                    console.log("  recordTime toISOString:", log.recordTime.toISOString());
                }
            }
        }
    } catch (e: any) {
        console.error("Error during diagnosis:", e.message || e);
    } finally {
        try { await zk.disconnect(); } catch(e) {}
    }
}

main();
`;

    const runCmd = `
        cat << 'EOF' > /var/www/purple-port/server/scripts/diagnose_real_logs.ts
${nodeScript}
EOF
        cd /var/www/purple-port/server
        npx ts-node scripts/diagnose_real_logs.ts
        rm -f scripts/diagnose_real_logs.ts
    `;
    
    conn.exec(runCmd, (err, stream) => {
        if (err) {
            console.error('Execution error:', err);
            conn.end();
            return;
        }
        stream.on('close', () => {
            conn.end();
            console.log('\nSSH connection closed.');
        });
        stream.on('data', (data) => {
            process.stdout.write(data.toString());
        });
        stream.stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect({ host: serverIp, port: 22, username, password });
