
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > debug_creative_sync.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function debug() {
            const startOfMarch = new Date('2026-03-01T00:00:00Z');
            const endOfMarch = new Date('2026-03-31T23:59:59Z');

            // 1. Check department counts
            const deptCounts = await prisma.task.groupBy({
                by: ['department'],
                _count: { id: true }
            });
            console.log('Department Counts:', JSON.stringify(deptCounts, null, 2));

            // 2. Check Creative tasks specifically
            const creativeTasks = await prisma.task.findMany({
                where: { department: 'CREATIVE' },
                select: { id: true, status: true, completed_date: true, createdAt: true, title: true }
            });
            console.log('Creative Tasks found:', creativeTasks.length);
            if (creativeTasks.length > 0) {
                console.log('Sample Creative Task:', JSON.stringify(creativeTasks[0], null, 2));
            }

            // 3. Check tasks assigned to the users in the screenshot
            const users = await prisma.user.findMany({
                where: { full_name: { in: ['Nidhin K', 'Irfan', 'Fathima Hasna K', 'Faris'] } },
                select: { id: true, full_name: true, department: true }
            });
            console.log('Users found:', JSON.stringify(users, null, 2));

            const userIds = users.map(u => u.id);
            const userTasks = await prisma.task.groupBy({
                by: ['department', 'status'],
                where: { assignee_id: { in: userIds } },
                _count: { id: true }
            });
            console.log('Tasks for these users by dept/status:', JSON.stringify(userTasks, null, 2));

            // 4. Check completed tasks in March for department CREATIVE
            const completedCount = await prisma.task.count({
                where: {
                    department: 'CREATIVE',
                    status: 'COMPLETED',
                    completed_date: { gte: startOfMarch, lte: endOfMarch }
                }
            });
            console.log('Completed Creative Tasks (March) with completed_date:', completedCount);

            const completedNoDateFilter = await prisma.task.count({
                where: {
                    department: 'CREATIVE',
                    status: 'COMPLETED'
                }
            });
            console.log('Completed Creative Tasks (Total) regardless of date:', completedNoDateFilter);

            await prisma.$disconnect();
        }
        debug();
EOF
        node debug_creative_sync.js
        rm debug_creative_sync.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
