const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    const cmd = `
        echo "Rebuilding PM2 process in the correct working directory..."
        pm2 delete qix-backend || true
        cd /var/www/purple-port/server
        NODE_ENV=production pm2 start dist/server.js --name qix-backend
        pm2 save
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log("PM2 process restarted in the correct directory.");
            conn.end();
        });
        stream.on('data', (data) => process.stdout.write(data.toString()));
        stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
