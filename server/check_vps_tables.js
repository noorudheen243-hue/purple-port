const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec('cd /var/www/purple-port/server && sqlite3 dev.db ".tables"', (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            console.log('--- VPS Tables ---');
            console.log(data.toString());
        }).on('close', (code, signal) => {
            conn.end();
        });
    });
}).connect({
    host: serverIp,
    port: 22,
    username: username,
    password: password
});
