const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    const query = `
        SELECT debit, credit, description, date 
        FROM JournalLine JL 
        JOIN JournalEntry JE ON JL.entry_id = JE.id 
        WHERE JL.ledger_id = '24f03c0d-906e-4a5c-a3b2-7f114b03e24b'
        ORDER BY date ASC
    `;
    conn.exec(`sqlite3 /var/www/purple-port/server/prisma/dev.db "${query}"`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
