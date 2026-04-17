const { PrismaClient } = require('@prisma/client');
const { MarketingSyncWorker } = require('./dist/modules/marketing-tasks/sync/syncWorker');
const prisma = new PrismaClient();

async function run() {
    console.log("--- SPECIAL 2-YEAR SYNC FOR DR BASIL ---");
    
    // 1. Find Client
    const client = await prisma.client.findFirst({
        where: { name: { contains: 'Basil' } }
    });
    
    if (!client) {
        throw new Error("Dr Basil client not found. Please create it in the UI first.");
    }
    
    console.log(`Found Client: ${client.name} (ID: ${client.id})`);

    // 2. Map Account if missing
    const adAccountId = 'act_1017260952339227';
    let acc = await prisma.marketingAccount.findFirst({
        where: { clientId: client.id, platform: 'meta' }
    });

    if (!acc) {
        console.log("Mapping new Meta Account...");
        const metaToken = await prisma.metaToken.findFirst({ where: { isActive: true } });
        if (!metaToken) throw new Error("No active Meta Profile found. Please connect Meta in Settings first.");
        
        acc = await prisma.marketingAccount.create({
            data: {
                clientId: client.id,
                platform: 'meta',
                externalAccountId: adAccountId,
                metaTokenId: metaToken.id
            }
        });
    } else if (acc.externalAccountId !== adAccountId) {
        console.log(`Updating Account ID to ${adAccountId}`);
        acc = await prisma.marketingAccount.update({
            where: { id: acc.id },
            data: { externalAccountId: adAccountId }
        });
    }

    console.log(`Account Linked: ${acc.externalAccountId}`);

    // 3. Trigger 2-year Sync
    const today = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setDate(today.getDate() - 730);
    
    console.log(`Starting sync from ${twoYearsAgo.toISOString()} to ${today.toISOString()}...`);
    
    // We need to discover campaigns first
    const { MetaAdsService } = require('./dist/modules/marketing-tasks/services/metaAdsService');
    const metaService = new MetaAdsService();
    const campaigns = await metaService.fetchCampaigns(acc.externalAccountId);
    console.log(`Found ${campaigns.length} campaigns for this account.`);

    for (const camp of campaigns) {
        // Create or Update Campaign in DB
        const campId = camp.id.toString();
        let dbCamp = await prisma.marketingCampaign.findFirst({
            where: { externalCampaignId: campId, platform: 'meta' }
        });
        
        if (!dbCamp) {
            dbCamp = await prisma.marketingCampaign.create({
                data: {
                    clientId: client.id,
                    platform: 'meta',
                    externalCampaignId: campId,
                    name: camp.name,
                    status: camp.status,
                    objective: camp.objective || 'UNKNOWN'
                }
            });
        }
        
        console.log(`Syncing metrics for campaign: ${camp.name} (${campId})...`);
        await MarketingSyncWorker.syncCampaignMetrics(dbCamp.id, acc.externalAccountId, 'meta', twoYearsAgo, today);
    }

    console.log("SYNC COMPLETED SUCCESSFULLY.");
}

run().catch(console.error).finally(() => prisma.$disconnect());
