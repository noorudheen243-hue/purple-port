const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH Client ready');
    const dbPath = '/var/www/purple-port/server/prisma/dev.db';
    
    const cmd = `
        sqlite3 ${dbPath} "DELETE FROM Lead WHERE name = 'Test Webhook Ingestion';"
        
        echo "--> Triggering Webhook Ingestion..."
        curl -s -X POST "http://localhost:4001/api/marketing/crm/webhooks/incoming?clientId=db6df8c3-0ec8-4b17-8071-e39746b8be35" \\
        -H "Content-Type: application/json" \\
        -d '{"name": "Test Webhook Ingestion", "phone": "1234567890", "email": "test@webhook.com", "groupId": "e9d72584-b172-48a6-86a0-5d55e6af6cf6"}'
        
        echo ""
        echo "--> Querying Database for Ingested Lead..."
        sqlite3 ${dbPath} "SELECT id, name, source, group_id, client_id, createdAt FROM Lead WHERE name = 'Test Webhook Ingestion';"
    `;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
              .on('data', (data) => process.stdout.write(data.toString()))
              .stderr.on('data', (data) => process.stderr.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
