const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    const sedCmd = "sed -i 's/console.log(\"DEBUG_STATEMENT_REQUEST:\",/console.log(\"!!! NEW CODE RUNNING !!!\", \"DEBUG_STATEMENT_REQUEST:\",/' /var/www/purple-port/server/dist/modules/accounting/service.js";
    conn.exec(`${sedCmd} && pm2 restart qix-api && echo "SED_SUCCESS"`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
