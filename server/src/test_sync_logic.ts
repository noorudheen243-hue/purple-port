import { MarketingSyncWorker } from './modules/marketing-tasks/sync/syncWorker';
import { PrismaClient } from '@prisma/client';

async function runSync() {
    console.log('Starting Manual Sync Logic Test...');
    // Sync last 30 days to be sure we get some data
    await MarketingSyncWorker.syncAllActiveCampaigns(30);
    console.log('Sync completed.');
    
    const prisma = new PrismaClient();
    const count = await prisma.marketingMetric.count();
    console.log('Total Marketing Metrics after sync:', count);
    
    const campaigns = await prisma.marketingCampaign.findMany({
        where: { platform: 'meta' },
        include: { marketingMetrics: { take: 1, orderBy: { date: 'desc' } } }
    });
    
    campaigns.forEach(c => {
        console.log(`Campaign: ${c.name} - Metrics: ${c.marketingMetrics.length}`);
    });
}

runSync().catch(console.error);
