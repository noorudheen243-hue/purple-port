
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

const clientId = 'b8199325-e5ee-4e64-85c1-bfcc20664d86';

const codeToRun = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log('Starting cleanup for Client ID: ${clientId}');
        
        // 1. Delete metrics
        const metricRes = await prisma.marketingMetric.deleteMany({
            where: { campaign: { clientId: '${clientId}' } }
        });
        console.log('Metrics deleted:', metricRes.count);

        // 2. Delete campaigns
        const campaignRes = await prisma.marketingCampaign.deleteMany({
            where: { clientId: '${clientId}' }
        });
        console.log('Campaigns deleted:', campaignRes.count);

        console.log('Cleanup successful.');
    } catch (err) {
        console.error('Cleanup failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
`;

conn.on('ready', () => {
    conn.exec(`cd /var/www/antigravity/server && node -e "${codeToRun.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
        stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
