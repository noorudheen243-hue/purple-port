
const { MetaAdsService } = require('./src/modules/marketing-tasks/services/metaAdsService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const metaService = new MetaAdsService();

async function diagnose(clientId) {
  try {
    console.log(`Diagnosing Meta Sync for Client ID: ${clientId}`);
    const account = await prisma.marketingAccount.findFirst({
      where: { clientId, platform: 'meta' },
      include: { metaToken: true }
    });

    if (!account) {
      console.log('Error: No marketing account found for this client.');
      return;
    }

    console.log(`Account found. External ID: "${account.externalAccountId}"`);
    console.log(`Meta Token exists: ${!!account.metaToken}`);
    if (account.metaToken) {
      console.log(`Token Name: ${account.metaToken.account_name}`);
      console.log(`Token Expires: ${account.metaToken.expires_at}`);
    }

    console.log('\nAttempting to fetch campaigns via MetaAdsService...');
    try {
      const campaigns = await metaService.fetchCampaigns(account.externalAccountId);
      console.log(`Success! Fetched ${campaigns.length} campaigns.`);
      campaigns.slice(0, 3).forEach(c => console.log(` - ${c.name} (${c.id})`));
    } catch (err) {
      console.error('Fetch Campaigns FAILED:', err.message);
      if (err.response) {
        console.error('Meta API Error Details:', JSON.stringify(err.response.data, null, 2));
      }
    }

  } catch (error) {
    console.error('Diagnosis error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get clientId from command line or default to Sky Talk
const targetId = process.argv[2] || 'e73d55d3-1732-4588-8cf1-749ce63cb763';
diagnose(targetId);
