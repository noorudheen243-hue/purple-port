import cron from 'node-cron';
import prisma from '../utils/prisma';
import { MetaLeadsService } from '../modules/marketing-tasks/services/metaLeadsService';
import { syncCrmCampaignData } from '../modules/marketing-tasks/crm.controller';

const metaLeadsService = new MetaLeadsService();

export const runMetaLeadsSyncJob = async () => {
    console.log('🚀 [Meta Leads Cron] Starting Meta Leads background sync job...');
    try {
        // Find all clients
        const clients = await prisma.client.findMany({
            select: { id: true, name: true }
        });

        for (const client of clients) {
            const clientId = client.id;
            
            // Try to find a Meta account for this client
            let account = await (prisma as any).marketingAccount.findFirst({
                where: {
                    clientId,
                    platform: 'meta',
                    OR: [
                        { accessToken: { not: null } },
                        { metaTokenId: { not: null } }
                    ]
                }
            });

            // Fall back to any active Meta account if not found
            if (!account) {
                account = await (prisma as any).marketingAccount.findFirst({
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
                // No Meta account connected at all in the system, skip client
                continue;
            }

            // Sync leads
            console.log(`[Meta Leads Cron] Syncing leads for client: ${client.name} (${clientId})...`);
            try {
                const result = await metaLeadsService.syncLeads(clientId, account.externalAccountId);
                await syncCrmCampaignData(clientId);
                console.log(`[Meta Leads Cron] Done for client ${client.name}: synced=${result.synced}, skipped=${result.skipped}`);
            } catch (err: any) {
                console.error(`[Meta Leads Cron] Error for client ${client.name}:`, err.message);
            }
        }
    } catch (error: any) {
        console.error('❌ [Meta Leads Cron] Meta Leads background sync failed:', error.message);
    }
};

export const initMetaLeadsSync = () => {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        await runMetaLeadsSyncJob();
    });
    console.log('⏰ Meta Leads Auto-Sync Cron initialized (every 30 minutes).');
};
