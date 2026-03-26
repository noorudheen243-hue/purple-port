
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    // Trigger the activity log endpoint (team view)
    const cmd = `curl -s "http://localhost:5000/api/client-portal/activity-logs?teamView=DM" > /dev/null && grep "ACTIVITY-DEBUG" /root/.pm2/logs/qix-backend-out.log | tail -n 20`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
