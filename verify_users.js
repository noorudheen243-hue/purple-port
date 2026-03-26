const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    // Run npx prisma studio --proxy or just a simple script to list users from the Correct DB
    const script = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:/var/www/purple-port/server/prisma/dev.db'
        }
    }
});

async function main() {
    const users = await prisma.user.findMany({ select: { email: true, full_name: true } });
    console.log('Users in DB:', JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
`;
    // We need to run this in the server folder where @prisma/client is installed
    conn.exec(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { cwd: '/var/www/antigravity/server' }, (err, stream) => {
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
