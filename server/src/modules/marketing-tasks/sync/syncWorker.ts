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
                const normalized = MarketingDataNormalizer.normalizeMetric(raw);

                if (isNaN(normalized.date.getTime())) {
                    console.warn(`Skipping invalid date for campaign ${campaignId} on ${platform}`);
                    continue;
                }

                // Ensure we don't mutate the original normalized date
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
                            conversations: normalized.conversations,
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
                            conversations: normalized.conversations,
                            ctr: normalized.ctr,
                            cpc: normalized.cpc,
                            cpm: normalized.cpm
                        }
                    });
                }
            }
        } catch (error) {
            console.error(`Error syncing metrics for campaign ${campaignId} on ${platform}`, error);
            throw error;
        }
    }

    /**
     * Main entry point for cron job to sync all active campaigns
     * @param daysBack - Number of days of history to sync. Defaults to 2 (yesterday and today).
     */
    public static async syncAllActiveCampaigns(daysBack: number = 2): Promise<void> {
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
                    let externalCampaigns = [];
                    if (acc.platform === 'meta') {
                        externalCampaigns = await metaService.fetchCampaigns(acc.externalAccountId);
                    } else if (acc.platform === 'google') {
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
                                    status: ext.status || 'ACTIVE',
                                    objective: ext.objective || 'UNKNOWN'
                                }
                            });
                        } else {
                            // Update name/status if changed
                            await (prisma as any).marketingCampaign.update({
                                where: { id: existing.id },
                                data: {
                                    name: ext.name,
                                    status: ext.status || 'ACTIVE'
                                }
                            });
                        }
                    }
                } catch (discErr) {
                    console.error(`Discovery failed for account ${acc.externalAccountId}:`, discErr);
                }
            }

            // Step 2: Sync Metrics for active, paused, and archived campaigns
            const targetCampaigns = await (prisma as any).marketingCampaign.findMany({
                where: { status: { in: ['ACTIVE', 'ENABLED', 'PAUSED', 'ARCHIVED'] } }
            });

            let successCount = 0;

            for (const camp of targetCampaigns) {
                try {
                    // Find the associated Marketing Account to get the externalAccountId
                    const account = await (prisma as any).marketingAccount.findFirst({
                        where: { clientId: camp.clientId, platform: camp.platform },
                        include: { metaToken: true }
                    });

                    if (!account || (!account.accessToken && !account.metaTokenId)) {
                        console.warn(`No marketing account with token or profile found for client ${camp.clientId} on ${camp.platform}. Skipping campaign.`);
                        continue;
                    }

                    await this.syncCampaignMetrics(camp.id.toString(), account.externalAccountId, camp.platform, startDate, today);
                    successCount++;
                } catch (err) {
                    console.error(`Failed to sync campaign ${camp.id}`, err);
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
                    details: `Successfully synced ${successCount} out of ${targetCampaigns.length} campaigns after discovery.`
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
