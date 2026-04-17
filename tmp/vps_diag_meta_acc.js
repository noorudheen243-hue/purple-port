const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    try {
        const client = await p.client.findFirst({ where: { client_code: 'QCN0025' } });
        if (!client) {
            console.log('CLIENT_NOT_FOUND');
            return;
        }
        console.log('CLIENT_ID:', client.id);

        const account = await p.marketingAccount.findFirst({
            where: { clientId: client.id, platform: 'meta' }
        });
        console.log('META_ACCOUNT:', JSON.stringify(account, null, 2));

        const syncLogs = await p.metaAdsLog.findMany({
            where: { client_id: client.id },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        console.log('RECENT_META_ADS_LOGS_FOR_CLIENT:', JSON.stringify(syncLogs, null, 2));

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await p.$disconnect();
    }
}
check();
