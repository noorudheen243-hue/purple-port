const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    try {
        const campaigns = await p.marketingCampaign.findMany({
            where: { platform: { in: ['meta', 'META'] } },
            take: 3,
            include: { marketingMetrics: { take: 1, orderBy: { date: 'desc' } } }
        });
        console.log('CAMPAIGNS:', JSON.stringify(campaigns.length));
        const log = await p.metaAdsLog.findFirst();
        console.log('META_LOG_SAMPLE:', JSON.stringify(log));
        const cols = Object.keys(log || {});
        console.log('LOG_COLUMNS:', cols.join(', '));
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await p.$disconnect();
    }
}
check();
