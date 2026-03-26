
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

const clientId = 'b8199325-e5ee-4e64-85c1-bfcc20664d86';

const localScriptPath = 'f:/Antigravity/vps_cleanup_payload.js';
const remoteScriptPath = '/tmp/cleanup_payload.js';

// Create the payload locally
const fs = require('fs');
const payload = `
const { PrismaClient } = require('/var/www/antigravity/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log('Updating account for Client ID: ${clientId}');
        
        const res = await prisma.marketingAccount.updateMany({
            where: { clientId: '${clientId}', platform: 'meta' },
            data: {
                externalAccountId: '2844542265768540',
                accessToken: null
            }
        });
        console.log('Account Updated:', res.count);

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
`;
fs.writeFileSync(localScriptPath, payload);

conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) throw err;
        const readStream = fs.createReadStream(localScriptPath);
        const writeStream = sftp.createWriteStream(remoteScriptPath);

        writeStream.on('close', () => {
            console.log('Payload uploaded.');
            conn.exec(`node ${remoteScriptPath}`, (err, stream) => {
                if (err) throw err;
                stream.on('close', () => conn.end());
                stream.on('data', (data) => process.stdout.write(data.toString()));
                stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
            });
        });

        readStream.pipe(writeStream);
    });
}).connect({ host: serverIp, port: 22, username, password });
