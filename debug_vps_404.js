
const { Client } = require('ssh2');

const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    const cmd = `
        echo "--- Directory Structure ---"
        ls -R /var/www/purple-port/server/public | head -n 20
        echo "--- Server Dist Structure ---"
        ls -R /var/www/purple-port/server/dist | head -n 20
        echo "--- PM2 Status ---"
        pm2 status
        echo "--- PM2 Logs (Last 50 lines) ---"
        pm2 logs qix-backend --lines 50 --no-daemon
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
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
