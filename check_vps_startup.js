
const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
    conn.exec('pm2 logs qix-backend --lines 20 --no-daemon', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
            .on('data', (data) => {
                process.stdout.write(data);
                conn.end(); // Stop after first chunk of logs
            })
            .stderr.on('data', (data) => process.stderr.write(data));
    });
}).connect({
    host: '66.116.224.221',
    port: 22,
    username: 'root',
    password: 'EzdanAdam@243'
});
