const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

const envContent = `
MARKETING_ENGINE_ENABLED="true"
META_APP_ID="placeholder_meta_app_id"
META_APP_SECRET="placeholder_meta_app_secret"
GOOGLE_CLIENT_ID="placeholder_google_client_id"
GOOGLE_CLIENT_SECRET="placeholder_google_client_secret"
API_URL="https://qixport.com"
`.trim();

conn.on('ready', () => {
    console.log('Client :: ready');
    // Append to .env if not already present
    // Using a safer way to append: check if the variable exists first is better, but for now simple append
    const cmd = `cat <<EOF >> /var/www/antigravity/server/.env
${envContent}
EOF`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Update complete. Restarting PM2...');
            conn.exec('pm2 restart qix-ads-v2.6', (err, stream) => {
                if (err) throw err;
                stream.on('close', () => {
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data.toString());
                });
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
