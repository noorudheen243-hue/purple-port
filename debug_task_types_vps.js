
const { Client } = require('ssh2');

const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > debug_task_types.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function check() {
            const tasks = await prisma.task.findMany({
                select: { id: true, title: true, type: true, campaign_type: true, department: true }
            });
            console.log(JSON.stringify(tasks, null, 2));
            await prisma.$disconnect();
        }
        check();
EOF
        node debug_task_types.js
        rm debug_task_types.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
