const { MarketingSyncWorker } = require('./dist/modules/marketing-tasks/sync/syncWorker.js');
console.log('[SYNC] Starting full sync for 100 days...');
MarketingSyncWorker.syncAllActiveCampaigns(100)
    .then(() => {
        console.log('[SYNC] COMPLETED SUCCESSFULLY');
        process.exit(0);
    })
    .catch(err => {
        console.error('[SYNC] FAILED:', err.message);
        process.exit(1);
    });
