
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > check_spaces.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function check() {
            const tasks = await prisma.task.findMany({
                select: { id: true, department: true },
                take: 10
            });
            console.log('Sample departments with lengths:');
            tasks.forEach(t => {
                console.log(\`ID: \${t.id}, Dept: "\${t.department}", Length: \${t.department?.length}\`);
            });

            const creativeAny = await prisma.task.count({
                where: { department: { contains: 'CREATIVE' } }
            });
            console.log('Tasks containing "CREATIVE":', creativeAny);

            const creativeExact = await prisma.task.count({
                where: { department: 'CREATIVE' }
            });
            console.log('Tasks exactly "CREATIVE":', creativeExact);

            await prisma.$disconnect();
        }
        check();
EOF
        node check_spaces.js
        rm check_spaces.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
