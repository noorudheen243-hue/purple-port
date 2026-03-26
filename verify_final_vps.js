
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > verify_final.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function verify() {
            const startOfMarch = new Date('2026-03-01T00:00:00Z');
            const endOfMarch = new Date('2026-03-31T23:59:59Z');
            const startOfMar05 = new Date('2026-03-05T00:00:00Z');
            const endOfMar05 = new Date('2026-03-05T23:59:59Z');

            const creativeTasks = await prisma.task.count({ where: { department: 'CREATIVE' } });
            const completedMarch = await prisma.task.count({ 
                where: { 
                    department: 'CREATIVE', 
                    status: 'COMPLETED',
                    completed_date: { gte: startOfMarch, lte: endOfMarch }
                } 
            });
            const assignedMar05 = await prisma.task.count({
                where: { createdAt: { gte: startOfMar05, lte: endOfMar05 } }
            });

            console.log('--- Final Verification ---');
            console.log('Total Creative Tasks:', creativeTasks);
            console.log('Completed Creative Tasks (March):', completedMarch);
            console.log('Tasks Created on Mar 05:', assignedMar05);

            await prisma.$disconnect();
        }
        verify();
EOF
        node verify_final.js
        rm verify_final.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
