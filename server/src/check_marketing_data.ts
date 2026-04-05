import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
    const campaigns = await prisma.marketingCampaign.findMany({
        include: {
            marketingMetrics: {
                orderBy: { date: 'desc' },
                take: 1
            }
        }
    });
    console.log('Total Campaigns:', campaigns.length);
    campaigns.forEach(c => {
        console.log(`Campaign: ${c.name} (${c.platform}) - Metrics: ${c.marketingMetrics.length}`);
        if (c.marketingMetrics.length > 0) {
            console.log('Latest Metrics:', c.marketingMetrics[0]);
        }
    });
}

checkData().finally(() => prisma.$disconnect());
