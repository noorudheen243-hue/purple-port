const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    // Find a client ledger with both debits and credits
    const query = `
        SELECT ledger_id, SUM(debit) as total_debit, SUM(credit) as total_credit 
        FROM JournalLine 
        GROUP BY ledger_id 
        HAVING total_debit > 0 AND total_credit > 0 
        LIMIT 5
    `;
    conn.exec(`sqlite3 /var/www/purple-port/server/prisma/dev.db "${query}"`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
