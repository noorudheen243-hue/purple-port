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
exports.syncCampaignsForAccount = exports.fetchInsights = exports.fetchAds = exports.fetchAdSets = exports.fetchCampaigns = exports.fetchAdAccounts = exports.storeUserToken = exports.exchangeCodeForToken = exports.getAuthUrl = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("../../utils/prisma"));
const META_API_VERSION = 'v19.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;
/**
 * Meta Service
 * Handles OAuth, Token Management, and Graph API calls.
 */
// --- OAuth & Tokens ---
const getAuthUrl = (formattedRedirectUri, clientId, state) => {
    // Scopes: specific to ads management and reading
    const scopes = [
        'ads_management',
        'ads_read',
        'read_insights',
        'business_management' // Optional, for client linking
    ];
    return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?client_id=${clientId}&redirect_uri=${formattedRedirectUri}&state=${state}&scope=${scopes.join(',')}`;
};
exports.getAuthUrl = getAuthUrl;
const exchangeCodeForToken = (code, redirectUri) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;
        const response = yield axios_1.default.get(`${META_GRAPH_URL}/oauth/access_token`, {
            params: {
                client_id: appId,
                redirect_uri: redirectUri,
                client_secret: appSecret,
                code: code
            }
        });
        return response.data; // { access_token, expires_in, ... }
    }
    catch (error) {
        console.error("Meta Token Exchange Error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw new Error("Failed to exchange code for token");
    }
});
exports.exchangeCodeForToken = exchangeCodeForToken;
const storeUserToken = (userId, tokenData) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if exists
    const existing = yield prisma_1.default.metaToken.findUnique({ where: { user_id: userId } });
    // Calculate expiry
    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;
    if (existing) {
        return yield prisma_1.default.metaToken.update({
            where: { user_id: userId },
            data: {
                access_token: tokenData.access_token,
                expires_at: expiresAt,
                updatedAt: new Date()
            }
        });
    }
    else {
        return yield prisma_1.default.metaToken.create({
            data: {
                user_id: userId,
                access_token: tokenData.access_token,
                expires_at: expiresAt
            }
        });
    }
});
exports.storeUserToken = storeUserToken;
// --- DATA FETCHING ---
const fetchAdAccounts = (accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Fetch attached ad accounts
    // query: me/adaccounts?fields=name,account_id,currency,account_status
    try {
        const response = yield axios_1.default.get(`${META_GRAPH_URL}/me/adaccounts`, {
            params: {
                access_token: accessToken,
                fields: 'name,account_id,currency,account_status,business_name'
            }
        });
        return response.data.data;
    }
    catch (error) {
        console.error("Fetch Ad Accounts Error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw error;
    }
});
exports.fetchAdAccounts = fetchAdAccounts;
const fetchCampaigns = (accountId, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // act_<ID>/campaigns
    try {
        const response = yield axios_1.default.get(`${META_GRAPH_URL}/${accountId}/campaigns`, {
            params: {
                access_token: accessToken,
                fields: 'id,name,status,objective,buying_type,start_time,stop_time,daily_budget,lifetime_budget,spend_cap',
                limit: 50
            }
        });
        return response.data.data;
    }
    catch (error) {
        console.error(`Fetch Campaigns Error (${accountId}):`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw error;
    }
});
exports.fetchCampaigns = fetchCampaigns;
const fetchAdSets = (campaignId, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const response = yield axios_1.default.get(`${META_GRAPH_URL}/${campaignId}/adsets`, {
            params: {
                access_token: accessToken,
                fields: 'id,name,status,start_time,end_time,daily_budget,lifetime_budget,bid_amount,billing_event,targeting',
                limit: 50
            }
        });
        return response.data.data;
    }
    catch (error) {
        console.error(`Fetch AdSets Error (${campaignId}):`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        return [];
    }
});
exports.fetchAdSets = fetchAdSets;
const fetchAds = (adSetId, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const response = yield axios_1.default.get(`${META_GRAPH_URL}/${adSetId}/ads`, {
            params: {
                access_token: accessToken,
                fields: 'id,name,status,creative{id,thumbnail_url,body,title,call_to_action_type}',
                limit: 50
            }
        });
        return response.data.data;
    }
    catch (error) {
        console.error(`Fetch Ads Error (${adSetId}):`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        return [];
    }
});
exports.fetchAds = fetchAds;
const fetchInsights = (objectId_1, accessToken_1, level_1, ...args_1) => __awaiter(void 0, [objectId_1, accessToken_1, level_1, ...args_1], void 0, function* (objectId, accessToken, level, datePreset = 'today') {
    try {
        const response = yield axios_1.default.get(`${META_GRAPH_URL}/${objectId}/insights`, {
            params: {
                access_token: accessToken,
                level: level,
                date_preset: datePreset,
                fields: 'spend,impressions,clicks,cpc,cpm,ctr,conversions,cost_per_conversion,reach,frequency,actions'
            }
        });
        return response.data.data;
    }
    catch (error) {
        // console.error(`Fetch Insights Error (${objectId}):`, error.response?.data || error.message);
        // Silent fail often better for insights as they might be empty
        return [];
    }
});
exports.fetchInsights = fetchInsights;
// --- SYNC LOGIC ---
const syncCampaignsForAccount = (adAccountId, metaAccountId, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[Sync] Starting sync for Account ${metaAccountId}`);
    // 1. Get Campaigns
    const campaigns = yield (0, exports.fetchCampaigns)(metaAccountId, accessToken);
    let count = 0;
    for (const camp of campaigns) {
        // Upsert Campaign
        const dbCamp = yield prisma_1.default.adCampaign.upsert({
            where: { external_id: camp.id },
            update: {
                name: camp.name,
                status: camp.status,
                objective: camp.objective,
                buying_type: camp.buying_type,
                start_time: camp.start_time ? new Date(camp.start_time) : null,
                end_time: camp.stop_time ? new Date(camp.stop_time) : null,
                daily_budget: camp.daily_budget ? parseFloat(camp.daily_budget) / 100 : null, // Meta cents
                lifetime_budget: camp.lifetime_budget ? parseFloat(camp.lifetime_budget) / 100 : null,
                spend_cap: camp.spend_cap ? parseFloat(camp.spend_cap) / 100 : null,
                updatedAt: new Date()
            },
            create: {
                external_id: camp.id,
                name: camp.name,
                status: camp.status,
                objective: camp.objective,
                buying_type: camp.buying_type,
                start_time: camp.start_time ? new Date(camp.start_time) : null,
                end_time: camp.stop_time ? new Date(camp.stop_time) : null,
                daily_budget: camp.daily_budget ? parseFloat(camp.daily_budget) / 100 : null,
                lifetime_budget: camp.lifetime_budget ? parseFloat(camp.lifetime_budget) / 100 : null,
                spend_cap: camp.spend_cap ? parseFloat(camp.spend_cap) / 100 : null,
                ad_account_id: adAccountId
            }
        });
        // 2. Get AdSets
        const adSets = yield (0, exports.fetchAdSets)(camp.id, accessToken);
        for (const set of adSets) {
            const dbSet = yield prisma_1.default.adSet.upsert({
                where: { meta_id: set.id },
                update: {
                    name: set.name,
                    status: set.status,
                    start_time: set.start_time ? new Date(set.start_time) : null,
                    end_time: set.end_time ? new Date(set.end_time) : null,
                    daily_budget: set.daily_budget ? parseFloat(set.daily_budget) / 100 : null,
                    lifetime_budget: set.lifetime_budget ? parseFloat(set.lifetime_budget) / 100 : null,
                    bid_strategy: set.bid_strategy,
                    billing_event: set.billing_event,
                    targeting: JSON.stringify(set.targeting),
                    updatedAt: new Date()
                },
                create: {
                    meta_id: set.id,
                    name: set.name,
                    status: set.status,
                    start_time: set.start_time ? new Date(set.start_time) : null,
                    end_time: set.end_time ? new Date(set.end_time) : null,
                    daily_budget: set.daily_budget ? parseFloat(set.daily_budget) / 100 : null,
                    lifetime_budget: set.lifetime_budget ? parseFloat(set.lifetime_budget) / 100 : null,
                    bid_strategy: set.bid_strategy,
                    billing_event: set.billing_event,
                    targeting: JSON.stringify(set.targeting),
                    campaign_id: dbCamp.id
                }
            });
            // 3. Get Ads
            const ads = yield (0, exports.fetchAds)(set.id, accessToken);
            for (const ad of ads) {
                const creative = ad.creative || {};
                yield prisma_1.default.adCreative.upsert({
                    where: { meta_id: ad.id },
                    update: {
                        name: ad.name,
                        status: ad.status,
                        thumbnail_url: creative.thumbnail_url,
                        body_text: creative.body,
                        headline: creative.title,
                        call_to_action: creative.call_to_action_type,
                        updatedAt: new Date()
                    },
                    create: {
                        meta_id: ad.id,
                        name: ad.name,
                        status: ad.status,
                        thumbnail_url: creative.thumbnail_url,
                        body_text: creative.body,
                        headline: creative.title,
                        call_to_action: creative.call_to_action_type,
                        creative_id: creative.id,
                        ad_set_id: dbSet.id
                    }
                });
            }
        }
        count++;
    }
    console.log(`[Sync] Synced ${count} campaigns.`);
    return count;
});
exports.syncCampaignsForAccount = syncCampaignsForAccount;
