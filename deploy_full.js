const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const serverIp = '66.116.224.221';
const user = 'root';
const password = 'EzdanAdam@243';

const localClientDist = path.join(__dirname, 'client', 'dist');
const remoteClientDist = '/var/www/purple-port/client/dist';

const localServerDist = path.join(__dirname, 'server', 'dist');
const remoteServerDist = '/var/www/purple-port/server/dist';

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
                    else { res(); }
                });
            });
        }
    }
}

console.log('Connecting to', serverIp);
conn.on('ready', () => {
    console.log('Connected!');
    conn.sftp(async (err, sftp) => {
        if (err) throw err;
        
        console.log('Clearing and uploading Client dist...');
        await new Promise((res) => conn.exec(`rm -rf ${remoteClientDist} && mkdir -p ${remoteClientDist}`, (e, s) => s.on('close', res)));
        await uploadDir(sftp, localClientDist, remoteClientDist);
        console.log('Client dist uploaded.');

        console.log('Clearing and uploading Server dist...');
        await new Promise((res) => conn.exec(`rm -rf ${remoteServerDist} && mkdir -p ${remoteServerDist}`, (e, s) => s.on('close', res)));
        await uploadDir(sftp, localServerDist, remoteServerDist);
        console.log('Server dist uploaded.');

        console.log('Restarting services...');
        const cmd = `cd /var/www/purple-port/server && npx prisma db push --accept-data-loss && pm2 restart qix-ads-v2.7 && sleep 2 && pm2 status`;
        conn.exec(cmd, (err, stream) => {
            stream.on('close', () => {
                console.log('Deployment complete!');
                conn.end();
            }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
        });
    });
}).connect({ host: serverIp, port: 22, username: user, password });
