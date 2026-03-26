"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingSyncWorker = void 0;
const prisma_1 = __importDefault(require("../../../utils/prisma"));
const marketingNormalizer_1 = require("../normalizer/marketingNormalizer");
const metaAdsService_1 = require("../services/metaAdsService");
const googleAdsService_1 = require("../services/googleAdsService");
const metaLeadsService_1 = require("../services/metaLeadsService");
const metaService = new metaAdsService_1.MetaAdsService();
const googleService = new googleAdsService_1.GoogleAdsService();
const metaLeadsService = new metaLeadsService_1.MetaLeadsService();
class MarketingSyncWorker {
    /**
     * Syncs metrics for a specific platform and campaign within a date range
     */
    static syncCampaignMetrics(campaignId, accountId, platform, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let externalData = [];
                // Get the external ID from the DB record
                const campRecord = yield prisma_1.default.marketingCampaign.findUnique({
                    where: { id: campaignId }
                });
                if (!campRecord) {
                    console.warn(`Campaign ${campaignId} not found in DB. Skipping sync.`);
                    return;
                }
                const externalId = campRecord.externalCampaignId;
                if (platform === 'meta') {
                    externalData = yield metaService.fetchMetrics(externalId, accountId, from, to);
                }
                else if (platform === 'google') {
                    externalData = yield googleService.fetchMetrics(externalId, accountId, from, to);
                }
                else {
                    throw new Error(`Unsupported platform: ${platform}`);
                }
                for (const raw of externalData) {
                    const normalized = marketingNormalizer_1.MarketingDataNormalizer.normalizeMetric(raw);
                    if (isNaN(normalized.date.getTime())) {
                        console.warn(`Skipping invalid date for campaign ${campaignId} on ${platform}`);
                        continue;
                    }
                    // Ensure we don't mutate the original normalized date
                    const gte = new Date(normalized.date);
                    gte.setHours(0, 0, 0, 0);
                    const lt = new Date(normalized.date);
                    lt.setHours(23, 59, 59, 999);
                    const existing = yield prisma_1.default.marketingMetric.findFirst({
                        where: {
                            campaignId: campaignId,
                            date: {
                                gte: gte,
                                lt: lt
                            }
                        }
                    });
                    if (existing) {
                        yield prisma_1.default.marketingMetric.update({
                            where: { id: existing.id },
                            data: {
                                impressions: normalized.impressions,
                                clicks: normalized.clicks,
                                spend: normalized.spend,
                                conversions: normalized.conversions,
                                reach: normalized.reach,
                                results: normalized.results,
                                ctr: normalized.ctr,
                                cpc: normalized.cpc,
                                cpm: normalized.cpm
                            }
                        });
                    }
                    else {
                        yield prisma_1.default.marketingMetric.create({
                            data: {
                                campaignId: campaignId,
                                date: normalized.date,
                                impressions: normalized.impressions,
                                clicks: normalized.clicks,
                                spend: normalized.spend,
                                conversions: normalized.conversions,
                                reach: normalized.reach,
                                results: normalized.results,
                                ctr: normalized.ctr,
                                cpc: normalized.cpc,
                                cpm: normalized.cpm
                            }
                        });
                    }
                }
            }
            catch (error) {
                console.error(`Error syncing metrics for campaign ${campaignId} on ${platform}`, error);
                throw error;
            }
        });
    }
    /**
     * Main entry point for cron job to sync all active campaigns
     * @param daysBack - Number of days of history to sync. Defaults to 2 (yesterday and today).
     */
    static syncAllActiveCampaigns() {
        return __awaiter(this, arguments, void 0, function* (daysBack = 2) {
            const log = yield prisma_1.default.marketingSyncLog.create({
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
                const allAccounts = yield prisma_1.default.marketingAccount.findMany({
                    where: {
                        OR: [
                            { accessToken: { not: null } },
                            { metaTokenId: { not: null } }
                        ]
                    }
                });
                console.log(`[SyncWorker] Found ${allAccounts.length} account(s) with tokens to sync:`, allAccounts.map((a) => `${a.platform}:${a.externalAccountId}`));
                for (const acc of allAccounts) {
                    try {
                        let externalCampaigns = [];
                        if (acc.platform === 'meta') {
                            externalCampaigns = yield metaService.fetchCampaigns(acc.externalAccountId);
                        }
                        else if (acc.platform === 'google') {
                            externalCampaigns = yield googleService.fetchCampaigns(acc.externalAccountId);
                        }
                        for (const ext of externalCampaigns) {
                            const campId = ext.id.toString();
                            const existing = yield prisma_1.default.marketingCampaign.findFirst({
                                where: { externalCampaignId: campId, platform: acc.platform }
                            });
                            if (!existing) {
                                yield prisma_1.default.marketingCampaign.create({
                                    data: {
                                        clientId: acc.clientId,
                                        platform: acc.platform,
                                        externalCampaignId: campId,
                                        name: ext.name,
                                        status: ext.status || 'ACTIVE',
                                        objective: ext.objective || 'UNKNOWN'
                                    }
                                });
                            }
                            else {
                                // Update name/status if changed
                                yield prisma_1.default.marketingCampaign.update({
                                    where: { id: existing.id },
                                    data: {
                                        name: ext.name,
                                        status: ext.status || 'ACTIVE'
                                    }
                                });
                            }
                        }
                    }
                    catch (discErr) {
                        console.error(`Discovery failed for account ${acc.externalAccountId}:`, discErr);
                    }
                }
                // Step 2: Sync Metrics for active campaigns
                const activeCampaigns = yield prisma_1.default.marketingCampaign.findMany({
                    where: { status: { in: ['ACTIVE', 'ENABLED'] } }
                });
                let successCount = 0;
                for (const camp of activeCampaigns) {
                    try {
                        // Find the associated Marketing Account to get the externalAccountId
                        const account = yield prisma_1.default.marketingAccount.findFirst({
                            where: { clientId: camp.clientId, platform: camp.platform },
                            include: { metaToken: true }
                        });
                        if (!account || (!account.accessToken && !account.metaTokenId)) {
                            console.warn(`No marketing account with token or profile found for client ${camp.clientId} on ${camp.platform}. Skipping campaign.`);
                            continue;
                        }
                        yield this.syncCampaignMetrics(camp.id.toString(), account.externalAccountId, camp.platform, startDate, today);
                        successCount++;
                    }
                    catch (err) {
                        console.error(`Failed to sync campaign ${camp.id}`, err);
                    }
                }
                // Step 3: Automated Lead Sync for all Meta Accounts
                console.log(`[SyncWorker] Starting automated lead sync for ${allAccounts.filter((a) => a.platform === 'meta').length} Meta account(s)`);
                for (const acc of allAccounts) {
                    if (acc.platform === 'meta') {
                        try {
                            yield metaLeadsService.syncLeads(acc.clientId, acc.externalAccountId);
                        }
                        catch (leadErr) {
                            console.error(`Lead sync failed for account ${acc.externalAccountId}:`, leadErr);
                        }
                    }
                }
                yield prisma_1.default.marketingSyncLog.update({
                    where: { id: log.id },
                    data: {
                        status: 'SUCCESS',
                        finishedAt: new Date(),
                        details: `Successfully synced ${successCount} out of ${activeCampaigns.length} campaigns after discovery.`
                    }
                });
            }
            catch (overallError) {
                yield prisma_1.default.marketingSyncLog.update({
                    where: { id: log.id },
                    data: {
                        status: 'FAILED',
                        finishedAt: new Date(),
                        details: overallError.message
                    }
                });
            }
        });
    }
}
exports.MarketingSyncWorker = MarketingSyncWorker;
