
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        cd /var/www/purple-port/server
        cat << 'EOF' > fix_data_final.js
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function fix() {
            try {
                // 1. Get all creative staff IDs
                const creativeStaff = await prisma.user.findMany({
                    where: { department: 'CREATIVE' },
                    select: { id: true }
                });
                const creativeStaffIds = creativeStaff.map(u => u.id);
                console.log('Creative Staff IDs:', creativeStaffIds.length);

                // 2. Update tasks assigned to creative staff that are currently in DM
                const result = await prisma.task.updateMany({
                    where: {
                        assignee_id: { in: creativeStaffIds },
                        department: 'DIGITAL_MARKETING',
                        campaign_type: null // Only if it's not a cross-department assignment
                    },
                    data: {
                        department: 'CREATIVE'
                    }
                });
                console.log('Restored tasks to CREATIVE based on assignee:', result.count);

                // 3. Update tasks that are GRAPHIC/VIDEO/GENERIC but in DM with null campaign_type
                const result2 = await prisma.task.updateMany({
                    where: {
                        department: 'DIGITAL_MARKETING',
                        campaign_type: null,
                        type: { in: ['GRAPHIC', 'VIDEO', 'GENERIC', 'COPY', 'CONTENT_SHOOTING'] }
                    },
                    data: {
                        department: 'CREATIVE'
                    }
                });
                console.log('Restored tasks to CREATIVE based on type:', result2.count);

                // 4. Final verification
                const counts = await prisma.task.groupBy({
                    by: ['department'],
                    _count: { id: true }
                });
                console.log('Final Department Counts:', JSON.stringify(counts, null, 2));

            } catch (err) {
                console.error('Fix failed:', err);
            } finally {
                await prisma.$disconnect();
                process.exit(0);
            }
        }
        fix();
EOF
        node fix_data_final.js
        rm fix_data_final.js
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
