const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const serverIp = '66.116.224.221';
const user = 'root';
const password = 'EzdanAdam@243';

const localClientZip = 'f:/Antigravity/client_dist.zip';
const remoteClientZip = '/var/www/purple-port/client_dist.zip';
const remoteClientDist = '/var/www/purple-port/client/dist';

const localServerZip = 'f:/Antigravity/server_dist.zip';
const remoteServerZip = '/var/www/purple-port/server_dist.zip';
const remoteServerDist = '/var/www/purple-port/server/dist';

conn.on('ready', () => {
    console.log('Connected! Uploading ZIPs...');
    conn.sftp(async (err, sftp) => {
        if (err) throw err;
        
        // Upload Client ZIP
        await new Promise((res, rej) => sftp.fastPut(localClientZip, remoteClientZip, (e) => e ? rej(e) : res()));
        console.log('Client ZIP uploaded!');

        // Upload Server ZIP
        await new Promise((res, rej) => sftp.fastPut(localServerZip, remoteServerZip, (e) => e ? rej(e) : res()));
        console.log('Server ZIP uploaded!');

        console.log('Extracting and Restarting...');
        const cmd = `
            apt-get install -y unzip &&
            rm -rf ${remoteClientDist} && mkdir -p ${remoteClientDist} && unzip -o ${remoteClientZip} -d ${remoteClientDist} &&
            rm -rf ${remoteServerDist} && mkdir -p ${remoteServerDist} && unzip -o ${remoteServerZip} -d ${remoteServerDist} &&
            cd /var/www/purple-port/server && npx prisma db push --accept-data-loss && pm2 restart qix-ads-v2.7 &&
            rm ${remoteClientZip} ${remoteServerZip} &&
            pm2 status
        `;
        conn.exec(cmd, (err, stream) => {
            stream.on('close', () => {
                console.log('Deployment via ZIP complete!');
                conn.end();
            }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
        });
    });
}).connect({ host: serverIp, port: 22, username: user, password });
