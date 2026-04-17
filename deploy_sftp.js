const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const serverIp = '66.116.224.221';
const user = 'root';
const password = 'EzdanAdam@243';
const localZip = path.join(__dirname, 'deploy_package.zip');
const remoteZip = '/root/deploy_package.zip';
const remoteScript = '/root/deploy_remote.sh';
const localScript = path.join(__dirname, 'deploy_remote.sh');

console.log('Connecting to ' + serverIp + '...');

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('SFTP session started. Uploading zip...');
        sftp.fastPut(localZip, remoteZip, {}, (err) => {
            if (err) throw err;
            console.log('Zip uploaded successfully. Uploading script...');
            sftp.fastPut(localScript, remoteScript, {}, (err) => {
                if (err) throw err;
                console.log('Script uploaded successfully. Executing script...');
                conn.exec(`bash ${remoteScript}`, (err, stream) => {
                    if (err) throw err;
                    stream.on('close', (code, signal) => {
                        console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
                        conn.end();
                    }).on('data', (data) => {
                        process.stdout.write(data);
                    }).stderr.on('data', (data) => {
                        process.stderr.write(data);
                    });
                });
            });
        });
    });
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect({
    host: serverIp,
    port: 22,
    username: user,
    password: password
});
