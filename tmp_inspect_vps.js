
const { Client } = require('ssh2');
const conn = new Client();

const codeToRun = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
    const client = await prisma.client.findFirst({
        where: { name: { contains: 'Koomen' } }
    });
    
    if (!client) {
        console.log('Client not found');
        return;
    }

    console.log('Client ID:', client.id);

    const accounts = await prisma.marketingAccount.findMany({
        where: { clientId: client.id }
    });
    console.log('\\n--- Marketing Accounts ---');
    console.log(JSON.stringify(accounts, null, 2));

    const campaigns = await prisma.marketingCampaign.findMany({
        where: { clientId: client.id }
    });
    console.log('\\n--- Marketing Campaigns ---');
    console.log(JSON.stringify(campaigns, null, 2));

    const metrics = await prisma.marketingMetric.findMany({
        where: { campaignId: { in: campaigns.map(c => c.id) } }
    });
    
    // Sum metrics by campaign
    const campaignSummary = campaigns.map(c => {
        const campMetrics = metrics.filter(m => m.campaignId === c.id);
        const totalSpend = campMetrics.reduce((sum, m) => sum + (m.spend || 0), 0);
        const totalResults = campMetrics.reduce((sum, m) => sum + (m.results || 0), 0);
        return { name: c.name, id: c.id, externalId: c.externalCampaignId, spend: totalSpend, results: totalResults };
    });

    console.log('\\n--- Campaign Summaries ---');
    console.log(JSON.stringify(campaignSummary, null, 2));

    await prisma.$disconnect();
}

inspect();
`;

conn.on('ready', () => {
    conn.exec(`cd /var/www/antigravity/server && node -e "${codeToRun.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
            .on('data', (data) => process.stdout.write(data))
            .stderr.on('data', (data) => process.stderr.write(data));
    });
}).connect({
    host: '66.116.224.221',
    port: 22,
    username: 'root',
    password: 'EzdanAdam@243'
});
