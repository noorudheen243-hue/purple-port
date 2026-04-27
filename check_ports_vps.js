const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    // Check listening ports
    conn.exec('netstat -tulnp', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => {
            process.stdout.write(data.toString());
        });
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
