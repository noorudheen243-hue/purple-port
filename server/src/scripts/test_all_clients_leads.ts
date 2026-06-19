import { PrismaClient } from '@prisma/client';
import { MetaLeadsService } from '../modules/marketing-tasks/services/metaLeadsService';
import { syncCrmCampaignData } from '../modules/marketing-tasks/crm.controller';

const prisma = new PrismaClient();
const metaLeadsService = new MetaLeadsService();

async function main() {
    console.log('=== Sync Test for ALL clients ===');
    const clients = await prisma.client.findMany();
    
    for (const client of clients) {
        // Find if this client has a Meta integration
        const account = await prisma.marketingAccount.findFirst({
            where: { clientId: client.id, platform: 'meta' }
        });

        if (!account) continue;

        console.log(`\nClient: ${client.name} (${client.id})`);
        console.log(`Integration ID: ${account.id}, ExtAcc: ${account.externalAccountId}`);
        
        try {
            const result = await metaLeadsService.syncLeads(client.id, account.externalAccountId);
            console.log(`-> Sync Result: synced=${result.synced}, skipped=${result.skipped}`);
            if (result.synced > 0) {
                console.log(`-> Successfully synced ${result.synced} leads!`);
            }
        } catch (e: any) {
            console.error(`-> Error syncing:`, e.message || e);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
