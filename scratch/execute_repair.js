const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH connection established!');
    
    const repairTypeScript = `
import db from '../src/utils/prisma';
import { syncBiometrics } from '../src/modules/attendance/biometric.service';

async function main() {
    console.log("=== STARTING ATTENDANCE DATABASE REPAIR ===");
    
    // 1. Delete corrupted biometric records (excluding manual/regularized locks)
    console.log("Deleting non-regularized BIOMETRIC attendance records...");
    const deleteRes = await db.attendanceRecord.deleteMany({
        where: {
            method: 'BIOMETRIC',
            NOT: {
                status: 'REGULARIZED'
            }
        }
    });
    console.log("Deleted " + deleteRes.count + " attendance records.");

    // 2. Trigger biometric sync
    console.log("Triggering biometric sync to rebuild attendance records...");
    const syncRes = await syncBiometrics('MANUAL');
    console.log("Sync Response:", JSON.stringify(syncRes, null, 2));
    
    console.log("=== REPAIR COMPLETE ===");
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());
`;

    const runCmd = `
        cat << 'EOF' > /var/www/purple-port/server/scripts/repair_attendance.ts
${repairTypeScript}
EOF
        cd /var/www/purple-port/server
        npx ts-node scripts/repair_attendance.ts
        rm -f scripts/repair_attendance.ts
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
