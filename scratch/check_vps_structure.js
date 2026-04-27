const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec('echo "--- /var/www/ ---" && ls -la /var/www/ && echo "\n--- /var/www/purple-port/ ---" && ls -la /var/www/purple-port/ && echo "\n--- /var/www/purple-port/server/public/ ---" && ls -la /var/www/purple-port/server/public/ || echo "public folder missing"', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
