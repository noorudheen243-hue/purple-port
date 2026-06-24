const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH connection established!');
    
    const nodeScript = `
import db from '../src/utils/prisma';
import { AttendanceService } from '../src/modules/attendance/service';

async function main() {
    console.log("=== DEBUGGING SYNC ERROR ===");
    
    // We mock a simple sync process with raw logs
    // Let's check what logs are returned by biometric sync
    const status = await db.biometricDeviceStatus.findUnique({ where: { id: 'CURRENT' } });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Let's search if there are any cached logs or commands
    console.log("Cached Device Status IP:", status?.last_office_ip);
    
    // Let's connect directly or mock logs
    // Since we know the sync failed during processBiometricLogs, let's inspect what logs were passed.
    // We can write a custom processBiometricLogs wrapper that prints the first invalid log:
    const logs = [
        { staff_number: 'QIX0007', timestamp: new Date() },
        { staff_number: 'QIX0007', timestamp: new Date().toISOString() },
        { staff_number: 'QIX0007', timestamp: '2026-06-18 10:00:00' }
    ];
    
    console.log("Running processBiometricLogs on test logs...");
    const res = await AttendanceService.processBiometricLogs(logs);
    console.log("Test Logs Result:", JSON.stringify(res, null, 2));
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());
`;

    const runCmd = `
        cat << 'EOF' > /var/www/purple-port/server/scripts/debug_sync_error.ts
${nodeScript}
EOF
        cd /var/www/purple-port/server
        npx ts-node scripts/debug_sync_error.ts
        rm -f scripts/debug_sync_error.ts
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
