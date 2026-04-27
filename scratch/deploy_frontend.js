const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

const localFile = 'f:\\Antigravity\\frontend_fix.zip';
const remoteFile = '/tmp/frontend_fix.zip';

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('SFTP :: ready');
        sftp.fastPut(localFile, remoteFile, (err) => {
            if (err) throw err;
            console.log('Upload successful');
            conn.exec(`mkdir -p /var/www/purple-port/client/dist && unzip -o -q ${remoteFile} -d /var/www/purple-port/client/dist && chown -R www-data:www-data /var/www/purple-port/client/dist && systemctl reload nginx && echo "DEPLOY_SUCCESS"`, (err, stream) => {
                if (err) throw err;
                stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data.toString()));
            });
        });
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
