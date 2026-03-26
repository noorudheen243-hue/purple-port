const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    const cmds = [
        'cp /var/www/antigravity/.env /var/www/antigravity/server/.env',
        'cp /var/www/antigravity/updated_files/server_dist/package.json /var/www/antigravity/server/package.json',
        'pm2 restart qix-ads-v2.6'
    ].join(' && ');

    conn.exec(cmds, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            conn.end();
            console.log('Done with code ' + code);
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
