import { ingestDailyStats } from '../service';
import prisma from '../../../utils/prisma';

/**
 * MOCK WORKER
 * Simulates fetching data from Google/Meta APIs.
 * In production, this would use the actual SDKs.
 */

export const runIngestionJob = async () => {
    console.log("Starting Ad Ingestion Job...");

    // 1. Get all Active Campaigns with Ad Accounts
    const campaigns = await prisma.campaign.findMany({
        where: { status: 'ACTIVE' }, // Only active campaigns
        // In real world, we'd filter by those having linked ad_accounts
    });

    const mockStats = campaigns.map(campaign => {
        // Generate random realistic stats
        const spend = Math.floor(Math.random() * 5000) * 1000000; // 0-5000 INR in micros

        return {
            date: new Date(new Date().setHours(0, 0, 0, 0)), // Today midnight
            spend_micros: BigInt(spend),
            impressions: Math.floor(Math.random() * 10000),
            clicks: Math.floor(Math.random() * 500),
            conversions: Math.floor(Math.random() * 20),
            campaign_id: campaign.id,
            ad_account_id: 'mock_account_id'
        };
    });

    console.log(`Fetched stats for ${mockStats.length} campaigns.`);

    const result = await ingestDailyStats(mockStats);

    console.log(`Ingestion Complete. Processed: ${result.processed}`);
    return result;
};
