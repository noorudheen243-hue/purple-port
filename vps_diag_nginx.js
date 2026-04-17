const { Client } = require('ssh2');

const conn = new Client();
const serverIp = '66.116.224.221';
const user = 'root';
const password = 'EzdanAdam@243';

const commands = [
    'cat /etc/nginx/sites-enabled/default 2>/dev/null || cat /etc/nginx/sites-enabled/*.conf 2>/dev/null || cat /etc/nginx/nginx.conf | head -60',
    'ls -la /var/www/purple-port/client/dist/ | head -20',
    'ls -la /var/www/purple-port/ | head -20',
    'pm2 status'
].join(' && echo "---NEXT---" && ');

console.log('Connecting...');
conn.on('ready', () => {
    conn.exec(commands, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('Done, code:', code);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).connect({ host: serverIp, port: 22, username: user, password });
