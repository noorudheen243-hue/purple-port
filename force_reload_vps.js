const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    // Use --update-env to force PM2 to reload env vars from the environment/config
    // However, PM2 often needs them to be present in the shell or provided explicitly.
    // A better way is to stop, and start again from the directory so it reads .env.
    const cmd = 'cd /var/www/antigravity/server && pm2 stop qix-ads-v2.6 && pm2 delete qix-ads-v2.6 && pm2 start dist/server.js --name qix-ads-v2.6';

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('PM2 Full Restart Complete.');
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
