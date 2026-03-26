
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > debug_assignees.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function check() {
            const tasks = await prisma.task.findMany({
                where: { createdAt: { gte: new Date('2026-03-05T00:00:00Z') } },
                select: { id: true, title: true, assignee_id: true, department: true, assignee: { select: { department: true } } }
            });
            console.log('Tasks on March 05 with Assignee Dept:', JSON.stringify(tasks, null, 2));
            await prisma.$disconnect();
        }
        check();
EOF
        node debug_assignees.js
        rm debug_assignees.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
