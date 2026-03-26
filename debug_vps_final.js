
const { Client } = require('ssh2');

const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > debug_vps_data.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function check() {
            console.log('--- VPS Current Time ---');
            console.log(new Date().toLocaleString());

            const taskCount = await prisma.task.count();
            const metaCount = await prisma.metaAdsLog.count();
            const clientCount = await prisma.client.count();
            console.log('Counts - Tasks:', taskCount, 'MetaLogs:', metaCount, 'Clients:', clientCount);

            const userDepts = await prisma.user.groupBy({ by: ['department'], _count: { id: true } });
            console.log('User Departments:', JSON.stringify(userDepts, null, 2));

            const taskDepts = await prisma.task.groupBy({ by: ['department'], _count: { id: true } });
            console.log('Task Departments:', JSON.stringify(taskDepts, null, 2));

            const m5 = await prisma.metaAdsLog.findMany({
                where: { 
                    createdAt: { 
                        gte: new Date('2026-03-05T00:00:00Z'), 
                        lte: new Date('2026-03-05T23:59:59Z') 
                    } 
                }
            });
            console.log('Meta Logs on March 05 (UTC):', m5.length);

            const m5_local = await prisma.metaAdsLog.findMany({
                where: { 
                    createdAt: { 
                        gte: new Date('2026-03-04T18:30:00Z'), // IST 5:30 offset
                        lte: new Date('2026-03-05T18:29:59Z') 
                    } 
                }
            });
             console.log('Meta Logs on March 05 (IST context):', m5_local.length);

            const creativeTasks = await prisma.task.findMany({
                where: { department: 'CREATIVE' },
                take: 5
            });
            console.log('Creative Tasks sample:', JSON.stringify(creativeTasks, null, 2));

            await prisma.$disconnect();
        }
        check();
EOF
        node debug_vps_data.js
        rm debug_vps_data.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).connect({
    host: serverIp,
    port: 22,
    username: username,
    password: password
});
