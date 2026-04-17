const { MetaAdsService } = require('./src/modules/marketing-tasks/services/metaAdsService');
const metaService = new MetaAdsService();

async function main() {
  const accountId = '616308347710249'; // The new working ID
  console.log(`Verifying access to Ad Account: ${accountId}`);
  
  try {
    const campaigns = await metaService.fetchCampaigns(accountId);
    console.log('--- SYNC SUCCESSFUL ---');
    console.log(`Found ${campaigns.length} campaigns.`);
    if (campaigns.length > 0) {
      console.log('Sample Campaign:', campaigns[0].name);
    }
  } catch (err) {
    console.error('--- SYNC FAILED ---');
    console.error(err.response?.data || err.message);
  }
}

main().finally(() => process.exit());
