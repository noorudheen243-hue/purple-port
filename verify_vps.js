const { Client } = require('ssh2');

const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

console.log('Connecting to VPS for verification...');

conn.on('ready', () => {
    console.log('Client :: ready');
    // Check if the rules were seeded
    const cmd = 'cd /var/www/purple-port/server && npx prisma migrate status || echo "No migrate, trying query" && sqlite3 prisma/dev.db "SELECT count(*) FROM AttendanceCriteriaConfig;"';
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Stream closed with code ' + code);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).connect({
    host: serverIp,
    port: 22,
    username: username,
    password: password
});
