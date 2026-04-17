const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const serverIp = '66.116.224.221';
const user = 'root';
const password = 'EzdanAdam@243';
const localDistDir = path.join(__dirname, 'client', 'dist');
const remoteDistDir = '/var/www/purple-port/client/dist';

async function uploadDir(sftp, localDir, remoteDir) {
    // Create remote dir
    await new Promise((res, rej) => sftp.mkdir(remoteDir, (e) => res()));
    
    const entries = fs.readdirSync(localDir, { withFileTypes: true });
    for (const entry of entries) {
        const localPath = path.join(localDir, entry.name);
        const remotePath = remoteDir + '/' + entry.name;
        if (entry.isDirectory()) {
            await uploadDir(sftp, localPath, remotePath);
        } else {
            await new Promise((res, rej) => {
                sftp.fastPut(localPath, remotePath, {}, (err) => {
                    if (err) {
                        console.error('Error uploading', entry.name, err.message);
                        rej(err);
                    } else {
                        process.stdout.write('.');
                        res();
                    }
                });
            });
        }
    }
}

console.log('Connecting to', serverIp);
conn.on('ready', () => {
    console.log('Connected! Starting SFTP upload of client dist...');
    conn.sftp(async (err, sftp) => {
        if (err) throw err;
        
        // First clear remote dist
        await new Promise((res) => {
            conn.exec(`rm -rf ${remoteDistDir}/* && mkdir -p ${remoteDistDir}`, (err, stream) => {
                stream.on('close', res).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
            });
        });
        
        console.log('Remote dist cleared. Uploading files...');
        try {
            await uploadDir(sftp, localDistDir, remoteDistDir);
            console.log('\nUpload complete! Reloading Nginx and restarting PM2...');
            
            conn.exec(`nginx -s reload && pm2 logs qix-ads-v2.7 --lines 20 --nostream 2>&1 | tail -30`, (err, stream) => {
                stream.on('close', (code) => {
                    console.log('Done. Code:', code);
                    conn.end();
                }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write('STDERR:' + d));
            });
        } catch(e) {
            console.error('Upload failed:', e);
            conn.end();
        }
    });
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect({ host: serverIp, port: 22, username: user, password });
