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
exports.getAggregatedStats = exports.linkAdAccount = exports.getLinkedAdAccounts = exports.ingestDailyStats = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const ingestDailyStats = (stats) => __awaiter(void 0, void 0, void 0, function* () {
    // Upsert Logic:
    // If stats for (Date + Campaign) exist, overwrite them (Assume API correction).
    // If not, create new.
    let processed = 0;
    for (const stat of stats) {
        // We use Prisma upsert.
        // Needs a unique compound index on [date, campaign_id]
        yield prisma_1.default.spendSnapshot.upsert({
            where: {
                date_campaign_id: {
                    date: stat.date,
                    campaign_id: stat.campaign_id
                }
            },
            update: {
                spend_micros: stat.spend_micros,
                impressions: stat.impressions,
                clicks: stat.clicks,
                conversions: stat.conversions,
                ad_account_id: stat.ad_account_id
            },
            create: {
                date: stat.date,
                spend_micros: stat.spend_micros,
                impressions: stat.impressions,
                clicks: stat.clicks,
                conversions: stat.conversions,
                campaign_id: stat.campaign_id,
                ad_account_id: stat.ad_account_id,
                currency: 'INR' // Default for now
            }
        });
        processed++;
    }
    return { processed };
});
exports.ingestDailyStats = ingestDailyStats;
const getLinkedAdAccounts = (clientId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.adAccount.findMany({
        where: { client_id: clientId }
    });
});
exports.getLinkedAdAccounts = getLinkedAdAccounts;
const linkAdAccount = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.adAccount.create({ data });
});
exports.linkAdAccount = linkAdAccount;
const getAggregatedStats = (startDate, endDate, clientId) => __awaiter(void 0, void 0, void 0, function* () {
    const whereClause = {
        date: {
            gte: startDate,
            lte: endDate
        }
    };
    if (clientId) {
        const clientCampaigns = yield prisma_1.default.campaign.findMany({
            where: { client_id: clientId },
            select: { id: true }
        });
        whereClause.campaign_id = { in: clientCampaigns.map(c => c.id) };
    }
    // raw query might be better for aggregations, but prisma groupBy is fine for simple stuff
    const stats = yield prisma_1.default.spendSnapshot.groupBy({
        by: ['campaign_id', 'date'],
        where: whereClause,
        _sum: {
            spend_micros: true,
            impressions: true,
            clicks: true,
            conversions: true,
            revenue: true
        }
    });
    // We also need Campaign Names
    const campaigns = yield prisma_1.default.campaign.findMany({
        where: { id: { in: stats.map(s => s.campaign_id).filter(Boolean) } },
        select: { id: true, title: true, client: { select: { name: true } } }
    });
    const campaignMap = new Map(campaigns.map(c => [c.id, c]));
    // Transform to friendly format
    return stats.map(s => {
        var _a;
        const campaign = campaignMap.get(s.campaign_id);
        const spend = Number(s._sum.spend_micros || 0) / 1000000;
        const revenue = s._sum.revenue || 0;
        const roas = spend > 0 ? revenue / spend : 0;
        return {
            date: s.date,
            campaignId: s.campaign_id,
            campaignName: (campaign === null || campaign === void 0 ? void 0 : campaign.title) || 'Unknown',
            clientName: ((_a = campaign === null || campaign === void 0 ? void 0 : campaign.client) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
            spend,
            revenue,
            roas,
            impressions: s._sum.impressions || 0,
            clicks: s._sum.clicks || 0,
            conversions: s._sum.conversions || 0,
        };
    });
});
exports.getAggregatedStats = getAggregatedStats;
