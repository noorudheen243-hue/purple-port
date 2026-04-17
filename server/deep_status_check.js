const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const metaAdsService = require('./dist/modules/marketing-tasks/services/metaAdsService').MetaAdsService;
const metaService = new metaAdsService();

async function getStatus(clientId) {
    console.log(`Checking status for client: ${clientId}`);
    try {
        const account = await prisma.marketingAccount.findFirst({
            where: { clientId, platform: 'meta' },
            include: { metaToken: true }
        });

        if (!account || !account.externalAccountId) {
            console.log('Result: NOT_LINKED (No account found)');
            return;
        }

        console.log(`Found account: ${account.externalAccountId}`);
        
        try {
            await metaService.fetchCampaigns(account.externalAccountId, clientId);
            console.log('Result: ACTIVE (Successfully fetched campaigns)');
        } catch (error) {
            console.log(`Result: ERROR / EXPIRED (${error.message})`);
        }
    } catch (e) {
        console.log(`Logic error: ${e.message}`);
    }
}

async function run() {
    await getStatus('db6df8c3-0ec8-4b17-8071-e39746b8be35');
    process.exit(0);
}

run();
