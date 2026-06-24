const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { MetaLeadsService } = require('../dist/modules/marketing-tasks/services/metaLeadsService');
const { syncCrmCampaignData } = require('../dist/modules/marketing-tasks/crm.controller');

async function main() {
    const metaLeadsService = new MetaLeadsService();
    const clients = await prisma.client.findMany({
        select: { id: true, name: true }
    });

    console.log(`Starting sync for ${clients.length} clients...\n`);

    for (const client of clients) {
        const clientId = client.id;
        console.log(`Syncing client "${client.name}" (${clientId})...`);
        
        let account = await prisma.marketingAccount.findFirst({
            where: {
                clientId,
                platform: 'meta',
                OR: [
                    { accessToken: { not: null } },
                    { metaTokenId: { not: null } }
                ]
            }
        });

        if (!account) {
            account = await prisma.marketingAccount.findFirst({
                where: {
                    platform: 'meta',
                    OR: [
                        { metaTokenId: { not: null } },
                        { accessToken: { not: null } }
                    ]
                }
            });
        }

        if (!account) {
            console.log(`  - No Meta account connected.\n`);
            continue;
        }

        try {
            console.log(`  - Found connected Meta account: ${account.externalAccountId}. Syncing leads...`);
            const result = await metaLeadsService.syncLeads(clientId, account.externalAccountId);
            console.log(`  - Sync complete. Synced: ${result.synced}, Skipped: ${result.skipped}`);
            
            console.log(`  - Aligning CRM campaign group mappings...`);
            await syncCrmCampaignData(clientId);
            console.log(`  - Completed successfully for client: ${client.name}\n`);
        } catch (err) {
            console.error(`  - Error during sync for client "${client.name}":`, err.message, `\n`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
