import cron from 'node-cron';
import prisma from '../utils/prisma';
import { MarketingSyncWorker } from '../modules/marketing-tasks/sync/syncWorker';

// Define a cron job to run every hour
cron.schedule('0 * * * *', async () => {
    console.log('🚀 Starting marketing data sync job');
    const startTime = new Date();
    try {
        await MarketingSyncWorker.syncAllActiveCampaigns();
        console.log('✅ Marketing data sync completed');
    } catch (error) {
        console.error('❌ Marketing data sync failed', error);
    }
});

export default {};
