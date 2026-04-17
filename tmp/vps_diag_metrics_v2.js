const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    try {
        const client = await p.client.findFirst({ where: { client_code: 'QCN0025' } });
        if (!client) {
            console.log('CLIENT_NOT_FOUND');
            return;
        }
        console.log('CLIENT_ID:', client.id);

        const campaigns = await p.marketingCampaign.findMany({
            where: { clientId: client.id, platform: { in: ['meta', 'META'] } },
            include: {
                marketingMetrics: {
                    take: 1,
                    orderBy: { date: 'desc' }
                }
            }
        });

        console.log('CAMPAIGNS_COUNT:', campaigns.length);
        console.log('CAMPAIGNS_WITH_METRICS:', JSON.stringify(campaigns, null, 2));

        const metricsSample = await p.marketingMetric.findFirst({
            orderBy: { date: 'desc' }
        });
        console.log('LATEST_METRIC_SAMPLE_OVERALL:', JSON.stringify(metricsSample, null, 2));

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await p.$disconnect();
    }
}
check();
