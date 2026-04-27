const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

const localFile = 'f:\\Antigravity\\server\\package.json';
const remoteFile = '/var/www/purple-port/server/package.json';

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        sftp.fastPut(localFile, remoteFile, (err) => {
            if (err) throw err;
            console.log('Upload successful');
            conn.exec('cd /var/www/purple-port/server && npm run build && pm2 restart qix-api && echo "REBUILD_SUCCESS"', (err, stream) => {
                if (err) throw err;
                stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data.toString()));
                stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
            });
        });
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
