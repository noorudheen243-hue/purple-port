const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const metaAdsService = require('./src/modules/marketing-tasks/services/metaAdsService').default;
const metaService = new metaAdsService();

async function test() {
    try {
        const clientId = 'db6df8c3-0ec8-4b17-8071-e39746b8be35'; // Dr Basil
        const account = await prisma.marketingAccount.findFirst({
            where: { clientId, platform: 'meta' },
            include: { metaToken: true }
        });

        console.log('Account:', account.externalAccountId);
        
        try {
            const campaigns = await metaService.fetchCampaigns(account.externalAccountId, clientId);
            console.log('Campaigns found:', campaigns.length);
        } catch (e) {
            console.log('Fetch Error:', e.message);
        }
    } catch (e) {
        console.log('General Error:', e.message);
    }
    process.exit(0);
}

test();
