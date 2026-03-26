
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > check_dates.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function check() {
            const completed = await prisma.task.findMany({
                where: { department: 'CREATIVE', status: 'COMPLETED' },
                select: { id: true, completed_date: true, updatedAt: true, title: true }
            });
            console.log('Completed Creative Tasks:', completed.length);
            const missingDate = completed.filter(t => !t.completed_date);
            console.log('Tasks missing completed_date:', missingDate.length);
            if (missingDate.length > 0) {
                console.log('Sample missing date task:', JSON.stringify(missingDate[0], null, 2));
            }

            // 5. Total Creative Tasks currently in system
            const assigned = await prisma.task.count({
                where: {
                    department: 'CREATIVE',
                    status: { notIn: ['COMPLETED', 'CANCELLED'] }
                }
            });
            console.log('Assigned (Non-Completed) Creative Tasks count:', assigned);

            await prisma.$disconnect();
        }
        check();
EOF
        node check_dates.js
        rm check_dates.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
