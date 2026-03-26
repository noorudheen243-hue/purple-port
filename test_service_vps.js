
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > test_service_directly.js
        const { getDigitalMarketingDashboardStats } = require('./dist/modules/tasks/service');
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function test() {
            try {
                console.log('Testing getDigitalMarketingDashboardStats(2, 2026)...');
                const result = await getDigitalMarketingDashboardStats(2, 2026);
                console.log('Final Result:', JSON.stringify(result, null, 2));
            } catch (err) {
                console.error('Test failed:', err);
            } finally {
                await prisma.$disconnect();
                process.exit(0);
            }
        }
        test();
EOF
        node test_service_directly.js
        rm test_service_directly.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
