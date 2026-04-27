const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec('sed -i \'s|DATABASE_URL="file:./prisma/dev.db"|DATABASE_URL="file:/var/www/purple-port/server/prisma/dev.db"|\' /var/www/purple-port/server/.env && pm2 restart qix-api && echo "ENV_UPDATED_ABSOLUTE"', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
