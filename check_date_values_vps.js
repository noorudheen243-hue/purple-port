
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > check_date_values.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function check() {
            const completed = await prisma.task.findMany({
                where: { department: 'CREATIVE', status: 'COMPLETED' },
                select: { completed_date: true },
                take: 5
            });
            console.log('Sample completed_date values:', JSON.stringify(completed, null, 2));

            const marchCount = await prisma.task.count({
                where: {
                    department: 'CREATIVE',
                    status: 'COMPLETED',
                    completed_date: {
                        gte: new Date('2026-03-01T00:00:00Z'),
                        lte: new Date('2026-03-31T23:59:59Z')
                    }
                }
            });
            console.log('Creative tasks completed in March 2026:', marchCount);

            await prisma.$disconnect();
        }
        check();
EOF
        node check_date_values.js
        rm check_date_values.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
