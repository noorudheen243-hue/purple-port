const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH Client ready');
    const dbPath = '/var/www/purple-port/server/prisma/dev.db';
    
    const query = `
        echo "=== CLIENTS ==="
        sqlite3 ${dbPath} "SELECT id, name FROM Client;"
        echo ""
        echo "=== MARKETING GROUPS ==="
        sqlite3 ${dbPath} "SELECT id, name, client_id FROM MarketingGroup;"
        echo ""
        echo "=== CRM USERS ==="
        sqlite3 ${dbPath} "SELECT id, full_name, email, client_id, campaign_group_id FROM CrmUser;"
        echo ""
        echo "=== LEADS (LAST 20) ==="
        sqlite3 ${dbPath} "SELECT id, name, source, group_id, client_id, campaign_name, createdAt FROM Lead ORDER BY createdAt DESC LIMIT 20;"
    `;
    
    conn.exec(query, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
              .on('data', (data) => process.stdout.write(data.toString()))
              .stderr.on('data', (data) => process.stderr.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
