const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    // Check for the strict groupId filtering logic in the controller
    const cmd = "grep 'campaignWhere.group_id = groupId as string' /var/www/purple-port/server/src/modules/marketing-tasks/controller.ts";
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => {
            console.log('MATCH FOUND ON VPS:');
            process.stdout.write(data.toString());
        });
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
