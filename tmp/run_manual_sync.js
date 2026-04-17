const { MarketingSyncWorker } = require('./dist/modules/marketing-tasks/sync/syncWorker');

async function main() {
    console.log("Forcing 2-year background Meta Ads sync directly on the server...");
    
    // We pass 730 days to ensure it fetches 2 years of data
    await MarketingSyncWorker.syncAllActiveCampaigns(730);
    
    console.log("Sync fully completed.");
}

main().catch(console.error).then(() => process.exit(0));
