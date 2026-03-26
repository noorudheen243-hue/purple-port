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
exports.MetaAdsService = void 0;
const prisma_1 = __importDefault(require("../../../utils/prisma"));
const axios_1 = __importDefault(require("axios"));
const date_fns_1 = require("date-fns");
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';
class MetaAdsService {
    /**
     * Helper to fetch the valid access token for a given marketing account.
     */
    getValidToken(accountId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const account = yield prisma_1.default.marketingAccount.findFirst({
                where: { externalAccountId: accountId, platform: 'meta' },
                include: { metaToken: true }
            });
            if (!account) {
                throw new Error(`Meta Ads: No marketing account found for ID ${accountId}`);
            }
            // Prioritize the token from the linked MetaToken record (Global Profile)
            if ((_a = account.metaToken) === null || _a === void 0 ? void 0 : _a.access_token) {
                return account.metaToken.access_token;
            }
            if (!account.accessToken) {
                throw new Error(`Meta Ads: No access token found for account ${accountId}`);
            }
            return account.accessToken;
        });
    }
    /**
     * Fetch all Business Manager accounts/Ad Accounts the user has access to.
     */
    fetchAccounts(systemUserId, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            let userToken = 'mock-long-lived-meta-token';
            if (clientId) {
                const acc = yield prisma_1.default.marketingAccount.findFirst({
                    where: { clientId, platform: 'meta' },
                    include: { metaToken: true }
                });
                if ((_a = acc === null || acc === void 0 ? void 0 : acc.metaToken) === null || _a === void 0 ? void 0 : _a.access_token) {
                    userToken = acc.metaToken.access_token;
                }
                else if (acc === null || acc === void 0 ? void 0 : acc.accessToken) {
                    userToken = acc.accessToken;
                }
            }
            if (userToken === 'mock-long-lived-meta-token') {
                const user = yield prisma_1.default.user.findUnique({
                    where: { id: systemUserId },
                    include: { metaTokens: { where: { isActive: true }, take: 1 } }
                });
                userToken = ((_c = (_b = user === null || user === void 0 ? void 0 : user.metaTokens) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.access_token) || userToken;
            }
            // Local Sandbox Mock
            if (userToken.startsWith('mock')) {
                return [{ id: 'act_123456789', name: 'Antigravity Test Ad Account', account_status: 1 }];
            }
            try {
                const response = yield axios_1.default.get(`${META_GRAPH_URL}/me/adaccounts`, {
                    params: {
                        access_token: userToken,
                        fields: 'name,account_status,currency,timezone_name'
                    }
                });
                return response.data.data;
            }
            catch (error) {
                console.error('Meta API fetchAccounts error:', ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message);
                throw new Error('Failed to fetch Meta Ad Accounts');
            }
        });
    }
    ensureActPrefix(id) {
        if (!id)
            return id;
        return id.startsWith('act_') ? id : `act_${id}`;
    }
    /**
     * Fetch all campaigns under a specific Ad Account.
     */
    fetchCampaigns(accountId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const token = yield this.getValidToken(accountId);
            const formattedAccountId = this.ensureActPrefix(accountId);
            console.log(`[MetaAds] fetchCampaigns called for account: ${formattedAccountId}`);
            if (token.startsWith('mock')) {
                return [
                    { id: 'camp_meta_1', name: 'IG Awareness Q1', status: 'ACTIVE', objective: 'BRAND_AWARENESS' },
                    { id: 'camp_meta_2', name: 'FB Lead Gen - Real Estate', status: 'ACTIVE', objective: 'LEAD_GENERATION' }
                ];
            }
            try {
                const response = yield axios_1.default.get(`${META_GRAPH_URL}/${formattedAccountId}/campaigns`, {
                    params: {
                        access_token: token,
                        fields: 'id,name,status,objective',
                        // Use proper JSON array — single-quoted string was invalid and caused empty results
                        effective_status: JSON.stringify(['ACTIVE', 'PAUSED'])
                    }
                });
                const campaigns = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                console.log(`[MetaAds] fetchCampaigns result for ${formattedAccountId}: ${campaigns.length} campaigns.`, campaigns.map((c) => `${c.name}(${c.status})`));
                return campaigns;
            }
            catch (error) {
                console.error(`[MetaAds] fetchCampaigns error for ${formattedAccountId}:`, ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
                return [];
            }
        });
    }
    /**
     * Fetch daily insights (metrics) for a specific campaign over a date range.
     */
    fetchMetrics(campaignId, accountId, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const token = yield this.getValidToken(accountId);
            const formattedAccountId = this.ensureActPrefix(accountId);
            // Format dates as YYYY-MM-DD required by Meta Ads API
            const timeRange = JSON.stringify({
                since: (0, date_fns_1.format)(from, 'yyyy-MM-dd'),
                until: (0, date_fns_1.format)(to, 'yyyy-MM-dd')
            });
            if (token.startsWith('mock')) {
                // Generate some random seeded data based on the requested days
                const mockData = [];
                let currentDate = new Date(from);
                while (currentDate <= to) {
                    mockData.push({
                        date_start: (0, date_fns_1.format)(currentDate, 'yyyy-MM-dd'),
                        impressions: Math.floor(Math.random() * 5000),
                        reach: Math.floor(Math.random() * 4000), // Mock reach
                        clicks: Math.floor(Math.random() * 200),
                        spend: (Math.random() * 1000).toFixed(2),
                        results: Math.floor(Math.random() * 20), // Mock results
                        actions: [{ action_type: 'lead', value: Math.floor(Math.random() * 10) }]
                    });
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                return mockData;
            }
            try {
                const response = yield axios_1.default.get(`${META_GRAPH_URL}/${campaignId}/insights`, {
                    params: {
                        access_token: token,
                        time_range: timeRange,
                        time_increment: 1, // Daily breakdown
                        fields: 'impressions,reach,clicks,spend,actions,cpc,cpm,ctr'
                    }
                });
                // Map actions array to flat results/conversions
                const data = response.data.data || [];
                return data.map((day) => {
                    let totalResults = 0;
                    let totalConversions = 0;
                    if (day.actions && Array.isArray(day.actions)) {
                        // Find the most relevant resulting action for this campaign.
                        // Meta often returns both generic ("lead") and specific ("onsite_conversion.lead_grouped").
                        // To prevent double counting, we will take the max value of these primary conversion types.
                        let maxLeads = 0;
                        let maxMessages = 0;
                        let maxPurchases = 0;
                        for (const action of day.actions) {
                            const val = parseInt(action.value || '0', 10);
                            const type = action.action_type;
                            if (type.includes('lead'))
                                maxLeads = Math.max(maxLeads, val);
                            if (type.includes('messaging_conversation_started'))
                                maxMessages = Math.max(maxMessages, val);
                            if (type.includes('purchase'))
                                maxPurchases = Math.max(maxPurchases, val);
                        }
                        // The total results is the sum of unique maxed primary events
                        totalResults = maxLeads + maxMessages + maxPurchases;
                        totalConversions = totalResults;
                    }
                    return Object.assign(Object.assign({}, day), { results: totalResults, conversions: totalConversions });
                });
            }
            catch (error) {
                console.error(`Meta API fetchMetrics error for campaign ${campaignId}:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                return [];
            }
        });
    }
}
exports.MetaAdsService = MetaAdsService;
