const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

console.log('Connecting to VPS to fix API_URL...');

conn.on('ready', () => {
    // Replace API_URL value securely and restart the application
    const remoteCmd = `
        sed -i 's|API_URL="http://localhost:4001"|API_URL="https://qixport.com"|g' /var/www/purple-port/server/.env
        sed -i 's|API_URL=http://localhost:4001|API_URL="https://qixport.com"|g' /var/www/purple-port/server/.env
        echo "Verifying API_URL replacement:"
        cat /var/www/purple-port/server/.env | grep API_URL
        echo "Restarting backend..."
        cd /var/www/purple-port/server
        pm2 restart all
    `;
    
    conn.exec(remoteCmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            conn.end();
            console.log("Fix completed successfully.");
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
