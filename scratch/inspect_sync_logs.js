const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH connection established!');
    
    const nodeScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== BIOMETRIC DEVICE STATUS ===");
    const status = await prisma.biometricDeviceStatus.findMany();
    console.log(JSON.stringify(status, null, 2));

    console.log("\\n=== LATEST BIOMETRIC SYNC LOGS ===");
    const syncLogs = await prisma.biometricSyncLog.findMany({
        orderBy: { sync_time: 'desc' },
        take: 20
    });
    console.log(JSON.stringify(syncLogs, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
`;

    const runCmd = `
        cat << 'EOF' > /tmp/inspect_sync_temp.js
${nodeScript}
EOF
        cd /var/www/purple-port/server
        node -e "
            const path = require('path');
            const fs = require('fs');
            fs.writeFileSync('inspect_sync_run.js', fs.readFileSync('/tmp/inspect_sync_temp.js'));
        "
        node inspect_sync_run.js
        rm -f inspect_sync_run.js /tmp/inspect_sync_temp.js
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
