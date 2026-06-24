const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH connection established!');
    
    const nodeScript = `
import { AttendanceService } from '../src/modules/attendance/service';

async function main() {
    console.log("Testing various inputs for normalizeBiometricTimestamp:");
    
    const testCases = [
        new Date(),
        "2026-06-18T10:00:00.000Z",
        "2026-06-18 10:00:00",
        new Date(NaN),
        null,
        undefined
    ];
    
    for (const tc of testCases) {
        try {
            const res = AttendanceService.normalizeBiometricTimestamp(tc as any);
            console.log("Input:", tc, "| Output:", res, "| Valid:", !isNaN(res.getTime()));
        } catch (e: any) {
            console.log("Input:", tc, "| Error:", e.message);
        }
    }
}

main();
`;

    const runCmd = `
        cat << 'EOF' > /var/www/purple-port/server/scripts/test_normalization.ts
${nodeScript}
EOF
        cd /var/www/purple-port/server
        npx ts-node scripts/test_normalization.ts
        rm -f scripts/test_normalization.ts
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
