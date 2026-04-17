const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const metaAdsService = require('./dist/modules/marketing-tasks/services/metaAdsService').default;
const metaService = new metaAdsService();

async function check(clientId, name) {
    const account = await prisma.marketingAccount.findFirst({
        where: { clientId, platform: 'meta' },
        include: { metaToken: true }
    });

    if (!account) {
        console.log(`${name}: NO ACCOUNT RECORD`);
        return;
    }

    console.log(`${name} Status Check:`);
    console.log(`- Account ID: ${account.externalAccountId}`);
    console.log(`- Token: ${account.accessToken ? 'PRESENT' : 'MISSING'}`);
    
    try {
        const campaigns = await metaService.fetchCampaigns(account.externalAccountId, clientId);
        console.log(`- SUCCESS: Fetched ${campaigns.length} campaigns`);
    } catch (e) {
        console.log(`- FAILURE: ${e.message}`);
    }
    console.log('---');
}

async function run() {
    await check('db6df8c3-0ec8-4b17-8071-e39746b8be35', 'Dr Basil');
    await check('1dca8a40-5cf5-4b66-b256-0e5e2c1d6cae', 'Naadan');
    process.exit(0);
}

run();
