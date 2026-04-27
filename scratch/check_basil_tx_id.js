const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    const query = `
        SELECT debit, credit, description, date 
        FROM JournalLine 
        JOIN JournalEntry ON JournalLine.entry_id = JournalEntry.id 
        WHERE ledger_id = '2406a5bf-e8f1-4cb4-a8c6-0e0491c83030'
        ORDER BY date ASC
    `;
    conn.exec(`sqlite3 /var/www/purple-port/server/prisma/dev.db "${query}"`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
