
const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
    conn.exec('ls -l /var/www/purple-port/server/dist/modules/client_portal/activity.controller.js', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
            .on('data', (data) => process.stdout.write(data))
            .stderr.on('data', (data) => process.stderr.write(data));
    });
}).connect({
    host: '66.116.224.221',
    port: 22,
    username: 'root',
    password: 'EzdanAdam@243'
});
