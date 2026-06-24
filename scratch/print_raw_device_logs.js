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
    console.log("Connecting to device...");
    const zk = new ZKLib('223.181.8.251', 4370, 10000, 4000);
    try {
        await (zk as any).ztcp.createSocket();
        await (zk as any).ztcp.connect();
        console.log("Connected! Fetching logs...");
        const response = await zk.getAttendances();
        const logs = response && response.data ? response.data : [];
        console.log("Total logs:", logs.length);
        if (logs.length > 0) {
            console.log("Sample log 1:", JSON.stringify(logs[0]));
            console.log("Sample log 1 recordTime type:", typeof logs[0].recordTime);
            console.log("Sample log 1 recordTime instanceof Date:", logs[0].recordTime instanceof Date);
            console.log("Sample log 1 recordTime string representation:", String(logs[0].recordTime));
            
            console.log("Sample log last:", JSON.stringify(logs[logs.length - 1]));
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        try { await zk.disconnect(); } catch(e) {}
    }
}

main();
`;

    const runCmd = `
        cat << 'EOF' > /var/www/purple-port/server/scripts/print_raw_logs.ts
${nodeScript}
EOF
        cd /var/www/purple-port/server
        npx ts-node scripts/print_raw_logs.ts
        rm -f scripts/print_raw_logs.ts
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
