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
        take: 10
    });
    console.log(JSON.stringify(syncLogs, null, 2));

    console.log("\\n=== LATEST ATTENDANCE RECORDS ===");
    const records = await prisma.attendanceRecord.findMany({
        orderBy: { date: 'desc' },
        take: 20,
        include: {
            user: {
                select: {
                    full_name: true,
                    staffProfile: {
                        select: {
                            staff_number: true,
                            biometric_device_id: true
                        }
                    }
                }
            }
        }
    });
    console.log(JSON.stringify(records, null, 2));

    console.log("\\n=== STAFF PROFILES (BIOMETRIC IDENTIFIERS) ===");
    const staff = await prisma.staffProfile.findMany({
        select: {
            id: true,
            staff_number: true,
            biometric_device_id: true,
            user: {
                select: {
                    full_name: true
                }
            }
        }
    });
    console.log(JSON.stringify(staff, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
`;

    const runCmd = `
        cat << 'EOF' > /tmp/inspect_attendance_temp.js
${nodeScript}
EOF
        cd /var/www/purple-port/server
        node -e "
            const path = require('path');
            const fs = require('fs');
            fs.writeFileSync('inspect_attendance_run.js', fs.readFileSync('/tmp/inspect_attendance_temp.js'));
        "
        node inspect_attendance_run.js
        rm -f inspect_attendance_run.js /tmp/inspect_attendance_temp.js
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
