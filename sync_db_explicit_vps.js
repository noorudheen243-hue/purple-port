const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    // Set DATABASE_URL explicitly to the one found in the .env
    const dbPath = '/var/www/purple-port/server/prisma/dev.db';
    const cmd = `cd /var/www/antigravity/server && export DATABASE_URL="file:${dbPath}" && npx prisma db push --skip-generate && npx prisma generate`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('Prisma DB Push Complete with explicit URL.');
            conn.end();
        }).on('data', (data) => process.stdout.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username: username, password: password });
