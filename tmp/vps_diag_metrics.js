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
            where: { client_id: client.id, platform: { in: ['meta', 'META'] } },
            include: {
                marketingMetrics: {
                    take: 1,
                    orderBy: { date: 'desc' }
                }
            }
        });

        console.log('CAMPAIGNS:', JSON.stringify(campaigns, null, 2));

        // Check if there are any metrics at all in the database
        const totalMetrics = await p.marketingMetric.count();
        console.log('TOTAL_MARKETING_METRICS_COUNT:', totalMetrics);

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await p.$disconnect();
    }
}
check();
