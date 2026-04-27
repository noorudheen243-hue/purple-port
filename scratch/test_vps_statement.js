const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    // We need a valid ledger_id. Let's find one first.
    conn.exec('sqlite3 /var/www/purple-port/server/prisma/dev.db "SELECT id FROM Ledger LIMIT 1"', (err, stream) => {
        if (err) throw err;
        let ledgerId = '';
        stream.on('data', (data) => ledgerId += data.toString().trim());
        stream.on('close', () => {
            console.log('Testing with Ledger ID:', ledgerId);
            if (!ledgerId) {
                console.log('No ledger found');
                conn.end();
                return;
            }
            // Test the internal service function via a small node script on the VPS
            const testScript = `
const { getAccountStatement } = require('./dist/modules/accounting/service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const res = await getAccountStatement('${ledgerId}', new Date('2024-01-01'), new Date());
        console.log('SUCCESS:', JSON.stringify(res).substring(0, 100));
    } catch (e) {
        console.error('FAILURE:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
test();
            `;
            conn.exec(`cd /var/www/purple-port/server && echo "${testScript.replace(/"/g, '\\"')}" > test_statement.js && node test_statement.js`, (err, stream) => {
                if (err) throw err;
                stream.on('data', (data) => process.stdout.write(data.toString()));
                stream.on('close', () => conn.end());
            });
        });
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
