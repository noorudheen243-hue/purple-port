import prisma from '../../../utils/prisma';
import { MarketingDataNormalizer, ExternalMarketingMetric } from '../normalizer/marketingNormalizer';
import { MetaAdsService } from '../services/metaAdsService';
import { GoogleAdsService } from '../services/googleAdsService';

import { MetaLeadsService } from '../services/metaLeadsService';
const metaService = new MetaAdsService();
const googleService = new GoogleAdsService();
const metaLeadsService = new MetaLeadsService();

export class MarketingSyncWorker {
    /**
     * Syncs all campaigns and recent metrics for a specific client across all platforms
     */
    public static async syncClientCampaigns(clientId: string, daysBack: number = 7): Promise<void> {
        console.log(`[SyncWorker] Starting full sync for client: ${clientId} (${daysBack} days back)`);
        
        // Find all accounts for this client
        const accounts = await (prisma as any).marketingAccount.findMany({
            where: { clientId }
        });

        for (const acc of accounts) {
            try {
                let externalCampaigns: any[] = [];
                if (acc.platform === 'meta') {
                    externalCampaigns = await metaService.fetchCampaigns(acc.externalAccountId);
                } else if (acc.platform === 'google') {
                    externalCampaigns = await googleService.fetchCampaigns(acc.externalAccountId);
                }

                // Sync Campaign Metadata
                for (const ext of externalCampaigns) {
                    const extId = ext.id.toString();
                    const existing = await (prisma as any).marketingCampaign.findFirst({
                        where: { externalCampaignId: extId, platform: acc.platform }
                    });

                    // Meta budgets are usually in minor units (e.g. cents)
                    let budgetValue = parseFloat(ext.daily_budget || ext.lifetime_budget || '0');
                    if (acc.platform === 'meta' && budgetValue > 0) {
                        budgetValue = budgetValue / 100;
                    }

                    const data: any = {
                        clientId: acc.clientId,
                        platform: acc.platform,
                        externalCampaignId: extId,
                        name: ext.name,
                        status: ext.effective_status || ext.status || 'UNKNOWN',
                        objective: ext.objective || 'UNKNOWN',
                        budget: budgetValue,
                        bid_strategy: ext.bid_strategy,
                        startDate: ext.start_time ? new Date(ext.start_time) : null,
                        ends: ext.stop_time ? new Date(ext.stop_time) : null
                    };

                    if (!existing) {
                        await (prisma as any).marketingCampaign.create({ data });
                    } else {
                        await (prisma as any).marketingCampaign.update({
                            where: { id: existing.id },
                            data
                        });
                    }
                }

                // Sync Metrics for these campaigns
                const dbCampaigns = await (prisma as any).marketingCampaign.findMany({
                    where: { clientId, platform: acc.platform }
                });

                const today = new Date();
                const startDate = new Date();
                startDate.setDate(today.getDate() - (daysBack - 1));

                for (const camp of dbCampaigns) {
                    await this.syncCampaignMetrics(camp.id, acc.externalAccountId, acc.platform, startDate, today);
                }

                // Sync Leads for Meta
                if (acc.platform === 'meta') {
                    await metaLeadsService.syncLeads(clientId, acc.externalAccountId);
                }
            } catch (err: any) {
                console.error(`[SyncWorker] Account sync failed for ${acc.externalAccountId}:`, err.message);
            }
        }
    }

    /**
     * Syncs metrics for a specific platform and campaign within a date range
     */
    public static async syncCampaignMetrics(campaignId: string, accountId: string, platform: string, from: Date, to: Date): Promise<void> {
        try {
            let externalData: ExternalMarketingMetric[] = [];

            // Get the external ID from the DB record
            const campRecord = await (prisma as any).marketingCampaign.findUnique({
                where: { id: campaignId }
            });

            if (!campRecord) {
                console.warn(`Campaign ${campaignId} not found in DB. Skipping sync.`);
                return;
            }

            const externalId = campRecord.externalCampaignId;

            if (platform === 'meta') {
                externalData = await metaService.fetchMetrics(externalId, accountId, from, to);
            } else if (platform === 'google') {
                externalData = await googleService.fetchMetrics(externalId, accountId, from, to);
            } else {
                throw new Error(`Unsupported platform: ${platform}`);
            }

            for (const raw of externalData) {
                await this.upsertNormalizedMetric(campaignId, MarketingDataNormalizer.normalizeMetric(raw));
            }
        } catch (error: any) {
            console.error(`Error in syncCampaignMetrics:`, error.message);
        }
    }

    /**
     * Specialized sync for a single campaign on-demand.
     * Fetches the last N days of data and performs a targeted update.
     * Returns the latest metric row after sync.
     */
    public static async syncSingleCampaign(campaignId: string, daysBack: number = 7): Promise<any> {
        console.log(`[SyncWorker] Single Sync requested for campaign: ${campaignId}`);
        const campaign = await (prisma as any).marketingCampaign.findUnique({
            where: { id: campaignId }
        });

        if (!campaign) {
            throw new Error('Campaign not found');
        }

        const account = await (prisma as any).marketingAccount.findFirst({
            where: { clientId: campaign.clientId, platform: campaign.platform }
        });

        if (!account) {
            throw new Error('Account linked to campaign not found');
        }

        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - (daysBack - 1));
        startDate.setHours(0, 0, 0, 0);

        let externalMetrics: ExternalMarketingMetric[] = [];
        try {
            if (campaign.platform === 'meta') {
                externalMetrics = await metaService.fetchMetrics(campaign.externalCampaignId, account.externalAccountId, startDate, today);
            } else if (campaign.platform === 'google') {
                externalMetrics = await googleService.fetchMetrics(campaign.externalCampaignId, account.externalAccountId, startDate, today);
            }

            console.log(`[SyncWorker] Found ${externalMetrics.length} metrics for single sync of ${campaign.name}`);

            // Upsert metrics
            for (const metric of externalMetrics) {
                await this.upsertNormalizedMetric(campaign.id, MarketingDataNormalizer.normalizeMetric(metric));
            }

            // Return the latest metric for immediate UI update
            return await (prisma as any).marketingMetric.findFirst({
                where: { campaignId: campaign.id },
                orderBy: { date: 'desc' }
            });
        } catch (error: any) {
            console.error(`[SyncWorker] Single Campaign Sync Failed for ${campaignId}:`, error.message);
            throw error;
        }
    }

    private static async upsertNormalizedMetric(campaignId: string, normalized: any): Promise<void> {
        if (isNaN(normalized.date.getTime())) {
            console.warn(`Skipping invalid date for campaign ${campaignId}`);
            return;
        }

        const gte = new Date(normalized.date);
        gte.setHours(0, 0, 0, 0);
        const lt = new Date(normalized.date);
        lt.setHours(23, 59, 59, 999);

        const existing = await (prisma as any).marketingMetric.findFirst({
            where: {
                campaignId: campaignId,
                date: {
                    gte: gte,
                    lt: lt
                }
            }
        });

        if (existing) {
            await (prisma as any).marketingMetric.update({
                where: { id: existing.id },
                data: {
                    impressions: normalized.impressions,
                    clicks: normalized.clicks,
                    spend: normalized.spend,
                    conversions: normalized.conversions,
                    reach: normalized.reach,
                    results: normalized.results,
                    results_cost: normalized.results_cost,
                    conversations: normalized.conversations,
                    messaging_conversations: normalized.messaging_conversations,
                    new_messaging_contacts: normalized.new_messaging_contacts,
                    purchases: normalized.purchases,
                    cost_per_purchase: normalized.cost_per_purchase,
                    ctr: normalized.ctr,
                    cpc: normalized.cpc,
                    cpm: normalized.cpm
                }
            });
        } else {
            await (prisma as any).marketingMetric.create({
                data: {
                    campaignId: campaignId,
                    date: normalized.date,
                    impressions: normalized.impressions,
                    clicks: normalized.clicks,
                    spend: normalized.spend,
                    conversions: normalized.conversions,
                    reach: normalized.reach,
                    results: normalized.results,
                    results_cost: normalized.results_cost,
                    conversations: normalized.conversations,
                    messaging_conversations: normalized.messaging_conversations,
                    new_messaging_contacts: normalized.new_messaging_contacts,
                    purchases: normalized.purchases,
                    cost_per_purchase: normalized.cost_per_purchase,
                    ctr: normalized.ctr,
                    cpc: normalized.cpc,
                    cpm: normalized.cpm
                }
            });
        }
    }

    /**
     * Main entry point for cron job to sync all active campaigns
     * @param daysBack - Number of days of history to sync. Defaults to 2 (yesterday and today).
     */
    public static async syncAllActiveCampaigns(daysBack: number = 2): Promise<void> {
        const syncErrors: string[] = []; // Collect account-level errors to persist in logs

        const log = await (prisma as any).marketingSyncLog.create({
            data: {
                platform: 'ALL',
                status: 'IN_PROGRESS',
            }
        });

        try {
            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - (daysBack - 1)); // -1 because today is inclusive
            
            console.log(`[SyncWorker] Starting sync for the last ${daysBack} day(s) (from: ${startDate.toISOString().split('T')[0]})`);


            // Step 1: Discover New Campaigns for all linked accounts
            const allAccounts = await (prisma as any).marketingAccount.findMany({
                where: {
                    OR: [
                        { accessToken: { not: null } },
                        { metaTokenId: { not: null } }
                    ]
                }
            });

            console.log(`[SyncWorker] Found ${allAccounts.length} account(s) with tokens to sync:`, allAccounts.map((a: any) => `${a.platform}:${a.externalAccountId}`));

            for (const acc of allAccounts) {
                try {
                    console.log(`[SyncWorker] Processing account: ${acc.platform}:${acc.externalAccountId} for client: ${acc.clientId}`);
                    let externalCampaigns = [];
                    if (acc.platform === 'meta') {
                        // Reset all campaigns for this account to prevent ghost ACTIVE statuses
                        await (prisma as any).marketingCampaign.updateMany({
                            where: { platform: 'meta', clientId: acc.clientId },
                            data: { status: 'UNKNOWN' }
                        });
                        
                        // PURGE REMOVED: Relying on upsertNormalizedMetric below to handle updates for the sync window.
                        // This prevents wipes if the API call below fails or returns empty.
                        
                        externalCampaigns = await metaService.fetchCampaigns(acc.externalAccountId);
                    } else if (acc.platform === 'google') {
                        await (prisma as any).marketingCampaign.updateMany({
                            where: { platform: 'google', clientId: acc.clientId },
                            data: { status: 'UNKNOWN' }
                        });
                        externalCampaigns = await googleService.fetchCampaigns(acc.externalAccountId);
                    }

                    for (const ext of externalCampaigns) {
                        const campId = ext.id.toString();
                        const existing = await (prisma as any).marketingCampaign.findFirst({
                            where: { externalCampaignId: campId, platform: acc.platform }
                        });

                        if (!existing) {
                            await (prisma as any).marketingCampaign.create({
                                data: {
                                    clientId: acc.clientId,
                                    platform: acc.platform,
                                    externalCampaignId: campId,
                                    name: ext.name,
                                    status: ext.effective_status || ext.status || 'UNKNOWN',
                                    objective: ext.objective || 'UNKNOWN',
                                    budget: parseFloat(ext.daily_budget || ext.lifetime_budget || '0') / 100,
                                    bid_strategy: ext.bid_strategy,
                                    attribution_setting: ext.attribution_spec?.[0]?.attribution_window || ext.pacing_type?.[0] || null,
                                    startDate: (ext.start_time || ext.startDate) ? new Date(ext.start_time || ext.startDate) : null,
                                    ends: (ext.stop_time || ext.end_date || ext.endDate) ? new Date(ext.stop_time || ext.end_date || ext.endDate) : null
                                }
                            });
                            console.log(`[SyncWorker] Created new campaign: ${ext.name} (${campId})`);
                        } else {
                            // Update name/status/metadata if changed
                            await (prisma as any).marketingCampaign.update({
                                where: { id: existing.id },
                                data: {
                                    name: ext.name,
                                    status: ext.effective_status || ext.status || 'UNKNOWN',
                                    budget: parseFloat(ext.daily_budget || ext.lifetime_budget || '0') / 100,
                                    bid_strategy: ext.bid_strategy,
                                    attribution_setting: ext.attribution_spec?.[0]?.attribution_window || ext.pacing_type?.[0] || null,
                                    startDate: (ext.start_time || ext.startDate) ? new Date(ext.start_time || ext.startDate) : null,
                                    ends: (ext.stop_time || ext.end_date || ext.endDate) ? new Date(ext.stop_time || ext.end_date || ext.endDate) : null
                                }
                            });
                            console.log(`[SyncWorker] Updated metadata for campaign: ${ext.name} (${campId})`);
                        }
                    }
                } catch (discErr) {
                    const errMsg = `Discovery failed for account ${acc.externalAccountId}: ${(discErr as Error).message}`;
                    console.error(errMsg);
                    syncErrors.push(errMsg);
                }
            }

            // Step 2: Sync Metrics
            let successCount = 0;

            for (const acc of allAccounts) {
                // Determine if we process it with bulk or per-campaign
                if (acc.platform === 'meta') {
                    try {
                        console.log(`[SyncWorker] Fetching bulk metrics for Meta account: ${acc.externalAccountId}`);
                        
                        // Chunk fetching month by month to prevent OOM
                        let currentStart = new Date(startDate);
                        let finalEnd = new Date(today);
                        
                        while(currentStart <= finalEnd) {
                            let currentEnd = new Date(currentStart);
                            currentEnd.setMonth(currentEnd.getMonth() + 1);
                            if (currentEnd > finalEnd) currentEnd = finalEnd;
                            
                            console.log(`[SyncWorker] Fetching chunk: ${currentStart.toISOString()} to ${currentEnd.toISOString()}`);

                            const accountMetrics = await metaService.fetchAccountMetricsByCampaign(acc.externalAccountId, currentStart, currentEnd);

                            // Group by campaign_id
                            const metricsByCampaign = new Map();
                            for (const row of accountMetrics) {
                                if (!metricsByCampaign.has(row.campaign_id)) {
                                    metricsByCampaign.set(row.campaign_id, []);
                                }
                                metricsByCampaign.get(row.campaign_id).push(row);
                            }

                            for (const [extCampaignId, rows] of metricsByCampaign.entries()) {
                                let campRecord = await (prisma as any).marketingCampaign.findFirst({
                                    where: { externalCampaignId: extCampaignId, platform: 'meta' }
                                });

                                if (!campRecord) {
                                    campRecord = await (prisma as any).marketingCampaign.create({
                                        data: {
                                            clientId: acc.clientId,
                                            platform: acc.platform,
                                            externalCampaignId: extCampaignId,
                                            name: rows[0].campaign_name || 'Unknown Campaign',
                                            status: 'UNKNOWN',
                                            objective: 'UNKNOWN'
                                        }
                                    });
                                }

                                // Batch database writes to prevent SQLite locks
                                console.log(`[SyncWorker] Found ${rows.length} metric rows for campaign: ${extCampaignId}`);
                                for (let i = 0; i < rows.length; i++) {
                                    await this.upsertNormalizedMetric(campRecord.id.toString(), MarketingDataNormalizer.normalizeMetric(rows[i]));
                                    // Yield thread every 50 records to prevent SQLite locking
                                    if (i % 50 === 0) {
                                        await new Promise(resolve => setTimeout(resolve, 5));
                                    }
                                }
                                successCount++;
                            }

                            // Advance the exact offset
                            currentStart = new Date(currentEnd);
                            currentStart.setDate(currentStart.getDate() + 1);
                        }
                        
                    } catch (err) {
                        const errMsg = `Failed bulk sync for Meta account ${acc.externalAccountId}: ${(err as Error).message}`;
                        console.error(errMsg);
                        syncErrors.push(errMsg);
                    }
                } else if (acc.platform === 'google') {
                    // Sync Per-Campaign for Google
                    const targetGoogleCampaigns = await (prisma as any).marketingCampaign.findMany({
                        where: { 
                            clientId: acc.clientId, 
                            platform: 'google', 
                            status: { in: ['ACTIVE', 'ENABLED', 'PAUSED', 'ARCHIVED'] } 
                        }
                    });

                    for (const camp of targetGoogleCampaigns) {
                        try {
                            await this.syncCampaignMetrics(camp.id.toString(), acc.externalAccountId, camp.platform, startDate, today);
                            successCount++;
                        } catch (err) {
                            console.error(`Failed to sync campaign ${camp.id}`, err);
                        }
                    }
                }
            }

            // Step 3: Automated Lead Sync for all Meta Accounts
            console.log(`[SyncWorker] Starting automated lead sync for ${allAccounts.filter((a: any) => a.platform === 'meta').length} Meta account(s)`);
            for (const acc of allAccounts) {
                if (acc.platform === 'meta') {
                    try {
                        await metaLeadsService.syncLeads(acc.clientId, acc.externalAccountId);
                    } catch (leadErr) {
                        console.error(`Lead sync failed for account ${acc.externalAccountId}:`, leadErr);
                    }
                }
            }


            await (prisma as any).marketingSyncLog.update({
                where: { id: log.id },
                data: {
                    status: 'SUCCESS',
                    finishedAt: new Date(),
                    details: `Successfully synced ${successCount} campaigns. ${syncErrors.length > 0 ? 'Errors encountered: ' + syncErrors.join(' | ') : ''}`
                }
            });
        } catch (overallError) {
            await (prisma as any).marketingSyncLog.update({
                where: { id: log.id },
                data: {
                    status: 'FAILED',
                    finishedAt: new Date(),
                    details: (overallError as Error).message
                }
            });
        }
    }
}
