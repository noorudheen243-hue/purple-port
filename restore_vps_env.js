const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

const envContent = `PORT=4001
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-key-change-this"
CLIENT_URL="https://qixport.com"
BIOMETRIC_API_KEY="ag_bio_sync_v1_secret_key"
NODE_ENV=production
`;

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec(`echo "${envContent}" > /var/www/purple-port/server/.env`, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Environment file restored. Restarting qix-backend...');
            conn.exec('pm2 restart qix-backend', (err, stream2) => {
                if (err) throw err;
                stream2.on('close', () => {
                    console.log('qix-backend restarted.');
                    conn.end();
                }).on('data', (data) => process.stdout.write(data.toString()));
            });
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).connect({
    host: serverIp,
    port: 22,
    username: username,
    password: password
});
