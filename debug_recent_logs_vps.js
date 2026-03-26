
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > debug_recent_logs.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function check() {
            const logs = await prisma.metaAdsLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { id: true, campaign_name: true, createdAt: true }
            });
            console.log('Recent Meta Logs:', JSON.stringify(logs, null, 2));

            const tasks = await prisma.task.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { id: true, title: true, createdAt: true, department: true }
            });
            console.log('Recent Tasks:', JSON.stringify(tasks, null, 2));

            await prisma.$disconnect();
        }
        check();
EOF
        node debug_recent_logs.js
        rm debug_recent_logs.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
