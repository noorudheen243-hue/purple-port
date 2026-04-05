import { PrismaClient } from '@prisma/client';
import { MarketingSyncWorker } from './modules/marketing-tasks/sync/syncWorker';

const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING MANUAL SYNC TEST ---');
    
    // Sync for the last 7 days to ensure we get some data
    await MarketingSyncWorker.syncAllActiveCampaigns(7);
    
    console.log('--- SYNC COMPLETED ---');
    
    console.log('\n--- VERIFYING DATA ---');
    const campaigns = await prisma.marketingCampaign.findMany({
        where: { platform: 'meta' },
        include: {
            marketingMetrics: {
                orderBy: { date: 'desc' },
                take: 1
            }
        },
        take: 10
    });

    console.log(JSON.stringify(campaigns, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
