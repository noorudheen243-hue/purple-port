const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    // Run npx prisma to check the database on the VPS
    // Need to find where the app is installed. Based on check_vps_env.js it is /var/www/purple-port/server
    conn.exec('cd /var/www/purple-port/server && npx prisma query "SELECT * FROM SystemSetting WHERE key IN (\'META_APP_ID\', \'META_APP_SECRET\')" --quiet', (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
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
