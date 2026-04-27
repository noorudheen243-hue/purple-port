const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    // Check for light mode classes and INR formatting in the frontend source
    const cmd = "grep -E 'bg-slate-50|formatINR' /var/www/purple-port/client/src/pages/marketing/GroupDetailWindow.tsx";
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => {
            console.log('MATCH FOUND ON VPS (Light Mode/INR):');
            process.stdout.write(data.toString());
        });
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
