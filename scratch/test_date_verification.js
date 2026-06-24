const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH Client ready');
    
    const cmd = `
        cd /var/www/purple-port/server
        node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        async function run() {
            const startDate = '2026-06-10';
            const endDate = '2026-06-18';
            
            // Old way
            const endOld = new Date(endDate);
            const countOld = await prisma.lead.count({
                where: {
                    client_id: 'db6df8c3-0ec8-4b17-8071-e39746b8be35',
                    date: {
                        gte: new Date(startDate),
                        lte: endOld
                    }
                }
            });
            console.log('Count with old date logic (lte start of day):', countOld);
            
            // New way
            const endNew = new Date(endDate);
            endNew.setHours(23, 59, 59, 999);
            const countNew = await prisma.lead.count({
                where: {
                    client_id: 'db6df8c3-0ec8-4b17-8071-e39746b8be35',
                    date: {
                        gte: new Date(startDate),
                        lte: endNew
                    }
                }
            });
            console.log('Count with new date logic (lte end of day):', countNew);
            
            // List lead names found with new logic
            const leads = await prisma.lead.findMany({
                where: {
                    client_id: 'db6df8c3-0ec8-4b17-8071-e39746b8be35',
                    date: {
                        gte: new Date(startDate),
                        lte: endNew
                    }
                },
                select: { name: true, date: true }
            });
            console.log('Leads found:', leads);
        }
        run().catch(console.error).finally(() => prisma.\\$disconnect());
        "
    `;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
              .on('data', (data) => process.stdout.write(data.toString()))
              .stderr.on('data', (data) => process.stderr.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
