const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH connection established!');
    
    const nodeScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== LEADS FOR DR BASIL ===");
    const leads = await prisma.lead.findMany({
        where: { client_id: 'db6df8c3-0ec8-4b17-8071-e39746b8be35' },
        select: {
            id: true,
            name: true,
            phone: true,
            source: true,
            group_id: true,
            campaign_name: true,
            campaignId: true,
            date: true
        }
    });
    console.log(JSON.stringify(leads, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
`;

    const runCmd = `
        cat << 'EOF' > /tmp/inspect_db_temp.js
${nodeScript}
EOF
        cd /var/www/purple-port/server
        node -e "
            const path = require('path');
            const fs = require('fs');
            fs.writeFileSync('inspect_db_run.js', fs.readFileSync('/tmp/inspect_db_temp.js'));
        "
        node inspect_db_run.js
        rm -f inspect_db_run.js /tmp/inspect_db_temp.js
    `;
    
    conn.exec(runCmd, (err, stream) => {
        if (err) {
            console.error('Execution error:', err);
            conn.end();
            return;
        }
        stream.on('close', () => {
            conn.end();
            console.log('\nSSH connection closed.');
        });
        stream.on('data', (data) => {
            process.stdout.write(data.toString());
        });
        stream.stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect({ host: serverIp, port: 22, username, password });
