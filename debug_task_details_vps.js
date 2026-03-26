
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > debug_task_details.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function debug() {
            const users = await prisma.user.findMany({
                where: { full_name: { in: ['Nidhin K', 'Irfan', 'Fathima Hasna K', 'Faris'] } },
                select: { id: true }
            });
            const userIds = users.map(u => u.id);

            const tasks = await prisma.task.findMany({
                where: { assignee_id: { in: userIds } },
                select: { type: true, campaign_type: true, department: true },
                take: 20
            });
            console.log('Sample tasks for creative users:', JSON.stringify(tasks, null, 2));

            const distinctTypes = await prisma.task.findMany({
                where: { assignee_id: { in: userIds } },
                select: { type: true },
                distinct: ['type']
            });
            console.log('Distinct types for creative users:', JSON.stringify(distinctTypes, null, 2));

            await prisma.$disconnect();
        }
        debug();
EOF
        node debug_task_details.js
        rm debug_task_details.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
