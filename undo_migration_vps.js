
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > undo_migration.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function undo() {
            try {
                const result = await prisma.task.updateMany({
                    where: {
                        campaign_type: null,
                        type: { in: ['GRAPHIC', 'VIDEO', 'COPY', 'STRATEGY', 'DEV', 'CONTENT_SHOOTING'] },
                        department: 'DIGITAL_MARKETING'
                    },
                    data: {
                        department: 'CREATIVE'
                    }
                });
                console.log(\`Undo Migration: Restored \${result.count} tasks to CREATIVE.\`);

                // Also check if any are remaining in DIGITAL_MARKETING that shouldn't be
                const remaining = await prisma.task.count({
                    where: { department: 'DIGITAL_MARKETING', campaign_type: null }
                });
                 console.log(\`Remaining tasks in DIGITAL_MARKETING with campaign_type=null: \${remaining}\`);

            } catch (err) {
                console.error('Undo failed:', err);
            } finally {
                await prisma.$disconnect();
                process.exit(0);
            }
        }
        undo();
EOF
        node undo_migration.js
        rm undo_migration.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
