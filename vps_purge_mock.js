
const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

const codeToRun = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function purge() {
    const client = await prisma.client.findFirst({
        where: { name: { contains: 'Koomen' } }
    });
    
    if (!client) {
        console.log('Client not found');
        return;
    }

    console.log('Purging data for Client:', client.name, '(', client.id, ')');

    // 1. Delete all metrics for campaigns of this client
    const campaigns = await prisma.marketingCampaign.findMany({
        where: { clientId: client.id }
    });
    
    const campaignIds = campaigns.map(c => c.id);
    const metricDelete = await prisma.marketingMetric.deleteMany({
        where: { campaignId: { in: campaignIds } }
    });
    console.log('Deleted', metricDelete.count, 'metrics');

    // 2. Delete all campaign records (they will be recreated by discovery)
    const campaignDelete = await prisma.marketingCampaign.deleteMany({
        where: { clientId: client.id }
    });
    console.log('Deleted', campaignDelete.count, 'campaigns');

    // 3. Clear any existing sync logs for this client (optional but clean)
    // No direct client link in logs, so we skip.

    await prisma.$disconnect();
    console.log('Purge complete');
}

purge();
`;

conn.on('ready', () => {
    // Write the script to a temp file on VPS
    const vpsScriptPath = '/tmp/purge_marketing.js';
    conn.exec(`echo "${codeToRun.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\$/g, '\\$')}" > ${vpsScriptPath} && cd /var/www/antigravity/server && node ${vpsScriptPath}`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end());
        stream.on('data', (data) => process.stdout.write(data.toString()));
        stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
    });
}).connect({ host: serverIp, port: 22, username, password });
