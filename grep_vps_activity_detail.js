
const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
    // Search for the specific Counts: line
    conn.exec('grep -a "ACTIVITY-DEBUG" /root/.pm2/logs/qix-backend-out.log | tail -n 50', (err, stream) => {
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
