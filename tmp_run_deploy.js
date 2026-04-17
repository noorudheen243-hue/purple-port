const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

console.log('Connecting to VPS to run deploy_update.sh for Meta Callback fix...');

conn.on('ready', () => {
    console.log('Client :: ready');
    const remoteCmd = 'bash /var/www/purple-port/deploy_update.sh';
    
    conn.exec(remoteCmd, (err, stream) => {
        if (err) {
            console.error('Execution error:', err);
            conn.end();
            return;
        }
        stream.on('close', (code, signal) => {
            console.log('Remote execution closed with code ' + code);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect({
    host: serverIp,
    port: 22,
    username: username,
    password: password
});
