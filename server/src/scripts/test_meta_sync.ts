import { MetaLeadsService } from '../modules/marketing-tasks/services/metaLeadsService';
import prisma from '../utils/prisma';
import { syncCrmCampaignData } from '../modules/marketing-tasks/crm.controller';

const metaLeadsService = new MetaLeadsService();

async function main() {
    const clientId = '1f4f0934-9915-4fd9-b085-87e71208cbe8';
    const accountId = '616308347710249';
    console.log(`=== Manual Sync Test for Client: ${clientId}, Account: ${accountId} ===`);

    try {
        const result = await metaLeadsService.syncLeads(clientId, accountId);
        console.log('Sync Result:', result);
        
        console.log('Running CRM Campaign linking...');
        await syncCrmCampaignData(clientId);
        console.log('CRM Campaign linking done.');

        const leadsCount = await prisma.lead.count({ where: { client_id: clientId } });
        console.log(`Leads in DB for this client: ${leadsCount}`);
    } catch (e: any) {
        console.error('Error during manual sync:', e);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
