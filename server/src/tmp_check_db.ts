import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- SYNC LOGS ---');
    const logs = await prisma.marketingSyncLog.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(logs, null, 2));

    console.log('\n--- CAMPAIGN COUNT ---');
    const campaignCount = await prisma.marketingCampaign.count();
    console.log(`Total Campaigns: ${campaignCount}`);

    console.log('\n--- LATEST CAMPAIGNS ---');
    const campaigns = await prisma.marketingCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
            marketingMetrics: {
                orderBy: { date: 'desc' },
                take: 1
            }
        }
    });
    console.log(JSON.stringify(campaigns, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
