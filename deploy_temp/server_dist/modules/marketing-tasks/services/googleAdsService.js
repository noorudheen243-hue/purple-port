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
exports.GoogleAdsService = void 0;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const date_fns_1 = require("date-fns");
const prisma = new client_1.PrismaClient();
const GOOGLE_ADS_API_URL = 'https://googleads.googleapis.com/v16/customers';
class GoogleAdsService {
    /**
     * Helper to fetch the valid access token
     */
    getValidToken(accountId) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield prisma.marketingAccount.findFirst({
                where: { externalAccountId: accountId, platform: 'google' }
            });
            if (!account || !account.accessToken) {
                throw new Error(`Google Ads: No access token found for account ${accountId}`);
            }
            // In real implementation, check if tokenExpiry < now() and use refreshToken to get a new one.
            return account.accessToken;
        });
    }
    /**
     * Fetch Google Ads Customer Accounts accessible to the token
     */
    fetchAccounts(systemUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Fetch OAuth token (In reality, joined via user's linked google identity)
            const account = yield prisma.marketingAccount.findFirst({
                where: { platform: 'google', client: { account_manager_id: systemUserId } }
            });
            const token = (account === null || account === void 0 ? void 0 : account.accessToken) || 'mock-gads-token';
            if (token.startsWith('mock')) {
                return [{ id: '987654321', descriptiveName: 'Antigravity Demo Google Ads' }];
            }
            try {
                const response = yield axios_1.default.get(`https://googleads.googleapis.com/v16/customers:listAccessibleCustomers`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || ''
                    }
                });
                return response.data.resourceNames;
            }
            catch (error) {
                console.error('Google Ads API fetchAccounts error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error('Failed to fetch Google Ad Accounts');
            }
        });
    }
    /**
     * Fetch active campaigns
     */
    fetchCampaigns(customerId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const token = yield this.getValidToken(customerId);
            if (token.startsWith('mock')) {
                return [
                    { id: 'camp_gads_1', name: 'Search - IT Services - Exact', status: 'ENABLED' },
                    { id: 'camp_gads_2', name: 'PMax - Corporate Video Prod', status: 'ENABLED' }
                ];
            }
            try {
                const query = `
                SELECT campaign.id, campaign.name, campaign.status
                FROM campaign
                WHERE campaign.status = 'ENABLED'
            `;
                const response = yield axios_1.default.post(`${GOOGLE_ADS_API_URL}/${customerId}/googleAds:search`, {
                    query
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || ''
                    }
                });
                return ((_a = response.data.results) === null || _a === void 0 ? void 0 : _a.map((r) => r.campaign)) || [];
            }
            catch (error) {
                console.error('Google Ads API fetchCampaigns error:', ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
                return [];
            }
        });
    }
    /**
     * Fetch metrics daily
     */
    fetchMetrics(campaignId, accountId, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const token = yield this.getValidToken(accountId);
            if (token.startsWith('mock')) {
                const mockData = [];
                let currentDate = new Date(from);
                while (currentDate <= to) {
                    mockData.push({
                        segments: { date: (0, date_fns_1.format)(currentDate, 'yyyy-MM-dd') },
                        metrics: {
                            impressions: Math.floor(Math.random() * 2000),
                            reach: Math.floor(Math.random() * 1600), // Mock reach
                            clicks: Math.floor(Math.random() * 150),
                            costMicros: Math.floor(Math.random() * 500000000), // cost in micros
                            conversions: Math.floor(Math.random() * 5)
                        }
                    });
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                return mockData;
            }
            try {
                const fromStr = (0, date_fns_1.format)(from, 'yyyy-MM-dd');
                const toStr = (0, date_fns_1.format)(to, 'yyyy-MM-dd');
                const query = `
                SELECT 
                    segments.date,
                    metrics.impressions, 
                    metrics.clicks, 
                    metrics.cost_micros, 
                    metrics.conversions 
                FROM campaign 
                WHERE campaign.id = ${campaignId} 
                AND segments.date BETWEEN '${fromStr}' AND '${toStr}'
            `;
                const response = yield axios_1.default.post(`${GOOGLE_ADS_API_URL}/${accountId}/googleAds:search`, {
                    query
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || ''
                    }
                });
                return response.data.results || [];
            }
            catch (error) {
                console.error(`Google API fetchMetrics error ${campaignId}:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                return [];
            }
        });
    }
}
exports.GoogleAdsService = GoogleAdsService;
