import { MetaAdsService } from './modules/marketing-tasks/services/metaAdsService';

async function run() {
    console.log("Starting debug sync for 1017260952339227...");
    const metaService = new MetaAdsService();
    const accountId = '1017260952339227';
    
    // from Jan 1 2026 to Mar 31 2026
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-03-31T23:59:59Z');
    
    try {
        const metrics = await metaService.fetchAccountMetricsByCampaign(accountId, from, to);
        console.log(`Fetched ${metrics.length} daily metric records from Meta Insights.`);
        
        // Group by campaign
        const uniqueCampaigns = new Set(metrics.map(m => m.campaign_id));
        console.log(`Unique campaigns found in 2026 insights: ${uniqueCampaigns.size}`);
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}
run();
