const { MetaAdsService } = require('./dist/modules/marketing-tasks/services/metaAdsService');
const prisma = require('./dist/utils/prisma').default;

async function testFetch() {
    const meta = new MetaAdsService();
    // Test with the problematic account ID if known, otherwise using mock for now to verify field presence
    try {
        const campaigns = await meta.fetchCampaigns('act_123456789'); // This will hit mock if token starts with mock
        console.log('Sample Campaign:', campaigns[0]);
        if (campaigns[0].start_time || campaigns[0].start_date) {
            console.log('SUCCESS: Start time/date found.');
        } else {
            console.log('FAILURE: Start time/date missing.');
        }
    } catch (e) {
        console.error('Test failed:', e.message);
    }
    process.exit(0);
}

testFetch();
