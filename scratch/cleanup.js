const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH Client ready');
    const dbPath = '/var/www/purple-port/server/prisma/dev.db';
    
    conn.exec(`sqlite3 ${dbPath} "DELETE FROM Lead WHERE name = 'Test Webhook Ingestion';"`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('Database cleaned up successfully.');
            conn.end();
        });
    });
}).connect({ host: serverIp, port: 22, username, password });
