const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    const query = "SELECT entity_id FROM Ledger WHERE id = '21eace54-a201-4efe-8b6b-c73cf44c7dcc'";
    conn.exec(`sqlite3 /var/www/purple-port/server/prisma/dev.db "${query}"`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
