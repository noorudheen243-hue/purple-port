const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const serverIp = '66.116.224.221';
const user = 'root';
const password = 'EzdanAdam@243';

// Only upload the compiled JS dist (not src)
const localDistDir = path.join(__dirname, 'server', 'dist');
const remoteDistDir = '/var/www/purple-port/server/dist';

async function uploadDir(sftp, localDir, remoteDir) {
    await new Promise((res) => sftp.mkdir(remoteDir, (e) => res()));
    const entries = fs.readdirSync(localDir, { withFileTypes: true });
    for (const entry of entries) {
        const localPath = path.join(localDir, entry.name);
        const remotePath = remoteDir + '/' + entry.name;
        if (entry.isDirectory()) {
            await uploadDir(sftp, localPath, remotePath);
        } else {
            await new Promise((res, rej) => {
                sftp.fastPut(localPath, remotePath, {}, (err) => {
                    if (err) { console.error('Error uploading', entry.name, err.message); rej(err); }
                    else { process.stdout.write('.'); res(); }
                });
            });
        }
    }
}

console.log('Connecting to', serverIp);
conn.on('ready', () => {
    console.log('Connected! Uploading server dist...');
    conn.sftp(async (err, sftp) => {
        if (err) throw err;
        
        await new Promise((res) => {
            conn.exec(`rm -rf ${remoteDistDir} && mkdir -p ${remoteDistDir}`, (err, stream) => {
                stream.on('close', res).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
            });
        });
        
        console.log('Cleared remote dist. Uploading...');
        try {
            await uploadDir(sftp, localDistDir, remoteDistDir);
            console.log('\nServer dist uploaded! Running prisma and restarting PM2...');
            
            const cmd = `cd /var/www/purple-port/server && npx prisma db push --accept-data-loss 2>&1 | tail -5 && pm2 restart qix-ads-v2.7 && sleep 3 && pm2 status`;
            conn.exec(cmd, (err, stream) => {
                stream.on('close', (code) => {
                    console.log('\nDone. Code:', code);
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
