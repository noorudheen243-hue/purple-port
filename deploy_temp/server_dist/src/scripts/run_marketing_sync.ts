import { MarketingSyncWorker } from '../modules/marketing-tasks/sync/syncWorker';
import prisma from '../utils/prisma';

async function runSync() {
    console.log('Starting Manual Marketing sync for all clients (90 days)...');
    try {
        await MarketingSyncWorker.syncAllActiveCampaigns(90);
        console.log('Marketing sync completed successfully.');
    } catch (err) {
        console.error('Marketing sync failed:', err);
    }
}

runSync().finally(() => prisma.$disconnect());
