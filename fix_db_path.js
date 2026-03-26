const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    // Set the correct DATABASE_URL to the 4.3MB one
    const envContent = `PORT=4001
DATABASE_URL=file:/var/www/purple-port/server/prisma/dev.db
JWT_SECRET="super-secret-key-change-this"
CLIENT_URL="https://qixport.com"
BIOMETRIC_API_KEY="ag_bio_sync_v1_secret_key"
NODE_ENV="production"`;

    conn.exec(`echo '${envContent}' > /var/www/antigravity/server/.env && pm2 restart qix-ads-v2.6`, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
            console.log('Done with code ' + code);
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
