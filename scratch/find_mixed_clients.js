const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    const query = `
        SELECT L.id, L.name, SUM(JL.debit), SUM(JL.credit) 
        FROM Ledger L 
        JOIN JournalLine JL ON L.id = JL.ledger_id 
        WHERE L.entity_type = 'CLIENT' 
        GROUP BY L.id 
        HAVING SUM(JL.debit) > 0 AND SUM(JL.credit) > 0 
        LIMIT 5
    `;
    conn.exec(`sqlite3 /var/www/purple-port/server/prisma/dev.db "${query}"`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
