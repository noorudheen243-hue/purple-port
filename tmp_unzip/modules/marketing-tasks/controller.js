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
exports.middleware = exports.getAccounts = void 0;
exports.manualSync = manualSync;
exports.getMetrics = getMetrics;
exports.authMeta = authMeta;
exports.metaCallback = metaCallback;
exports.getMetaProfiles = getMetaProfiles;
exports.linkAccountToProfile = linkAccountToProfile;
exports.authGoogle = authGoogle;
exports.googleCallback = googleCallback;
exports.getIntegrationStatus = getIntegrationStatus;
exports.getAvailableAccounts = getAvailableAccounts;
exports.selectAccount = selectAccount;
exports.disconnectAccount = disconnectAccount;
exports.getLeads = getLeads;
exports.createLead = createLead;
exports.updateLead = updateLead;
exports.deleteLead = deleteLead;
exports.addFollowUp = addFollowUp;
exports.syncLeads = syncLeads;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("../../utils/prisma"));
const metaAdsService_1 = require("./services/metaAdsService");
const googleAdsService_1 = require("./services/googleAdsService");
const metaLeadsService_1 = require("./services/metaLeadsService");
const syncWorker_1 = require("./sync/syncWorker");
const metaService = new metaAdsService_1.MetaAdsService();
const googleService = new googleAdsService_1.GoogleAdsService();
const metaLeadsService = new metaLeadsService_1.MetaLeadsService();
// Simple feature flag check
function featureEnabled(req, res, next) {
    if (process.env.MARKETING_ENGINE_ENABLED !== 'true') {
        return res.status(403).json({ message: 'Marketing engine feature is disabled.' });
    }
    next();
}
function manualSync(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Sync the last 90 days when manually triggered (covers YTD 2026)
            yield syncWorker_1.MarketingSyncWorker.syncAllActiveCampaigns(90);
            res.json({ message: 'Sync completed successfully (90 days history + leads)' });
        }
        catch (error) {
            console.error('Marketing Sync Error:', error);
            res.status(500).json({ message: 'Sync failed', error: error.message });
        }
    });
}
function getMetrics(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { clientId, platform, from, to } = req.query;
            if (!from || !to) {
                return res.status(400).json({ message: 'from and to dates are required.' });
            }
            const dateFilter = {
                gte: new Date(from),
                lte: new Date(to)
            };
            const whereClause = {
                date: dateFilter
            };
            if (clientId) {
                whereClause.campaign = {
                    clientId: clientId
                };
            }
            else {
                // Ensure we are only getting metrics for campaigns that HAVE a client
                whereClause.campaign = {
                    clientId: { not: '' }
                };
            }
            if (platform) {
                if (!whereClause.campaign)
                    whereClause.campaign = {};
                whereClause.campaign.platform = platform;
            }
            const metrics = yield prisma_1.default.marketingMetric.findMany({
                where: whereClause,
                include: {
                    campaign: {
                        select: {
                            name: true,
                            platform: true,
                            objective: true,
                            status: true
                        }
                    }
                },
                orderBy: {
                    date: 'asc'
                }
            });
            // Calculate aggregates
            const summary = metrics.reduce((acc, curr) => {
                acc.impressions += (curr.impressions || 0);
                acc.clicks += (curr.clicks || 0);
                acc.spend += (curr.spend || 0);
                acc.conversions += (curr.conversions || 0);
                acc.reach += (curr.reach || 0);
                acc.results += (curr.results || 0);
                return acc;
            }, { impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0, results: 0 });
            res.json({
                summary,
                data: metrics
            });
        }
        catch (error) {
            console.error('Error fetching marketing metrics:', error);
            res.status(500).json({ message: 'Error fetching metrics', error: error.message });
        }
    });
}
// ==========================================
// OAuth 2.0 Integration Handlers
// ==========================================
function authMeta(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { clientId } = req.query; // clientId is optional now for global profile linking
        const state = clientId || 'global';
        // Load credentials from DB first, fallback to ENV
        const settings = yield prisma_1.default.systemSetting.findMany({
            where: { key: { in: ['META_APP_ID', 'META_APP_SECRET'] } }
        });
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        const appId = settingsMap['META_APP_ID'] || process.env.META_APP_ID;
        const redirectUri = `${process.env.API_URL || 'http://localhost:4001'}/api/marketing/auth/meta/callback`;
        if (!appId) {
            return res.status(400).send('Meta App ID is not configured. Please set it in Settings first.');
        }
        // Redirect to Facebook Dialog with reauthenticate to allow switching accounts easily
        const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=ads_management,ads_read,business_management,leads_retrieval,pages_manage_ads,pages_read_engagement&auth_type=reauthenticate`;
        res.redirect(authUrl);
    });
}
function metaCallback(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const { code, state } = req.query;
        if (!code || !state)
            return res.status(400).send('Missing code or state');
        const clientId = state === 'global' ? null : state;
        // Fallback if no user in req (for testing/local or redirect bounce)
        let userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            const adminUser = yield prisma_1.default.user.findFirst({
                where: { role: 'ADMIN' },
                select: { id: true }
            });
            if (!adminUser) {
                return res.status(500).send('No Admin user found to link this Meta account to.');
            }
            userId = adminUser.id;
        }
        try {
            const settings = yield prisma_1.default.systemSetting.findMany({
                where: { key: { in: ['META_APP_ID', 'META_APP_SECRET'] } }
            });
            const settingsMap = settings.reduce((acc, curr) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {});
            const appId = settingsMap['META_APP_ID'] || process.env.META_APP_ID;
            const appSecret = settingsMap['META_APP_SECRET'] || process.env.META_APP_SECRET;
            const redirectUri = `${process.env.API_URL || 'http://localhost:4001'}/api/marketing/auth/meta/callback`;
            // Exchange code for short-lived token
            const tokenRes = yield axios_1.default.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
                params: {
                    client_id: appId,
                    redirect_uri: redirectUri,
                    client_secret: appSecret,
                    code
                }
            });
            const shortToken = tokenRes.data.access_token;
            // Exchange for long-lived token
            const longTokenRes = yield axios_1.default.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: appId,
                    client_secret: appSecret,
                    fb_exchange_token: shortToken
                }
            });
            const longToken = longTokenRes.data.access_token;
            // Fetch Meta user info (Name and ID)
            const meRes = yield axios_1.default.get(`https://graph.facebook.com/v19.0/me`, {
                params: { access_token: longToken, fields: 'id,name' }
            });
            const metaUserName = meRes.data.name;
            const metaUserId = meRes.data.id;
            // Bypass Prisma SQLite 'upsert' bug - Use manual find + update/create
            const existingMetaToken = yield prisma_1.default.metaToken.findFirst({
                where: { meta_user_id: metaUserId, user_id: userId }
            });
            let metaToken;
            if (existingMetaToken) {
                metaToken = yield prisma_1.default.metaToken.update({
                    where: { id: existingMetaToken.id },
                    data: {
                        access_token: longToken,
                        account_name: metaUserName,
                        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                    }
                });
            }
            else {
                metaToken = yield prisma_1.default.metaToken.create({
                    data: {
                        id: `token-${metaUserId}-${userId}`,
                        user_id: userId,
                        access_token: longToken,
                        account_name: metaUserName,
                        meta_user_id: metaUserId,
                        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                    }
                });
            }
            // If clientId was provided, also update/create the MarketingAccount
            if (clientId) {
                const existingAccount = yield prisma_1.default.marketingAccount.findFirst({
                    where: { clientId, platform: 'meta' }
                });
                if (existingAccount) {
                    yield prisma_1.default.marketingAccount.update({
                        where: { id: existingAccount.id },
                        data: {
                            accessToken: longToken,
                            tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                            metaTokenId: metaToken.id
                        }
                    });
                }
                else {
                    yield prisma_1.default.marketingAccount.create({
                        data: {
                            clientId,
                            platform: 'meta',
                            externalAccountId: 'meta-account-linked',
                            accessToken: longToken,
                            tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                            metaTokenId: metaToken.id
                        }
                    });
                }
            }
            res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/marketing-integrations?success=meta`);
        }
        catch (e) {
            console.error('Meta OAuth Error:', ((_b = e.response) === null || _b === void 0 ? void 0 : _b.data) || e.message);
            res.status(500).send('Callback Failed: ' + (((_e = (_d = (_c = e.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) === null || _e === void 0 ? void 0 : _e.message) || e.message));
        }
    });
}
function getMetaProfiles(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const profiles = yield prisma_1.default.metaToken.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    account_name: true,
                    meta_user_id: true,
                    updatedAt: true,
                    marketingAccounts: {
                        select: {
                            id: true,
                            clientId: true,
                            metaTokenId: true,
                            externalAccountId: true,
                            client: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });
            res.json(profiles);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
}
const getAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.user;
    const { clientId } = req.query;
    try {
        const accounts = yield metaService.fetchAccounts(id, clientId);
        res.json(accounts);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getAccounts = getAccounts;
function linkAccountToProfile(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { clientId, profileId, externalAccountId } = req.body;
        if (!clientId || !profileId)
            return res.status(400).send('Missing clientId or profileId');
        try {
            const profile = yield prisma_1.default.metaToken.findUnique({ where: { id: profileId } });
            if (!profile)
                return res.status(404).send('Profile not found');
            const existingAccount = yield prisma_1.default.marketingAccount.findFirst({
                where: { clientId, platform: 'meta' }
            });
            if (existingAccount) {
                yield prisma_1.default.marketingAccount.update({
                    where: { id: existingAccount.id },
                    data: {
                        metaTokenId: profileId,
                        accessToken: profile.access_token,
                        externalAccountId: externalAccountId || existingAccount.externalAccountId
                    }
                });
            }
            else {
                yield prisma_1.default.marketingAccount.create({
                    data: {
                        clientId,
                        platform: 'meta',
                        metaTokenId: profileId,
                        accessToken: profile.access_token,
                        externalAccountId: externalAccountId || 'pending-selection'
                    }
                });
            }
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
}
function authGoogle(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { clientId } = req.query;
        if (!clientId)
            return res.status(400).send('clientId is required');
        const googleClientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = `${process.env.API_URL || 'http://localhost:4001'}/api/marketing/auth/google/callback`;
        // Sandbox Bypass: If Client ID is a placeholder, perform a mock redirect to our own callback
        if (!googleClientId || googleClientId.includes('placeholder')) {
            console.log(`[SANDBOX] Bypassing Google OAuth for client: ${clientId}`);
            return res.redirect(`${redirectUri}?code=sandbox&state=${clientId}`);
        }
        const scope = 'https://www.googleapis.com/auth/adwords';
        // Redirect to Google Dialog
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${clientId}`;
        res.redirect(authUrl);
    });
}
function googleCallback(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const { code, state: clientId } = req.query;
        if (!code || !clientId)
            return res.status(400).send('Missing code or clientId');
        // Sandbox Handler
        if (code === 'sandbox') {
            yield prisma_1.default.marketingAccount.deleteMany({
                where: { clientId: clientId, platform: 'google' }
            });
            yield prisma_1.default.marketingAccount.create({
                data: {
                    clientId: clientId,
                    platform: 'google',
                    externalAccountId: 'mock-google-ads-account',
                    accessToken: 'mock-access-token-' + clientId,
                    refreshToken: 'mock-refresh-token-' + clientId,
                    tokenExpiry: new Date(Date.now() + 3600 * 1000)
                }
            });
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/marketing-integrations?success=google`);
        }
        try {
            const googleClientId = process.env.GOOGLE_CLIENT_ID;
            const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
            const redirectUri = `${process.env.API_URL || 'http://localhost:4001'}/api/marketing/auth/google/callback`;
            const tokenRes = yield axios_1.default.post('https://oauth2.googleapis.com/token', {
                code,
                client_id: googleClientId,
                client_secret: googleClientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            });
            const { access_token, refresh_token, expires_in } = tokenRes.data;
            // Clean up old ones for this client
            yield prisma_1.default.marketingAccount.deleteMany({
                where: { clientId: clientId, platform: 'google' }
            });
            yield prisma_1.default.marketingAccount.create({
                data: {
                    clientId: clientId,
                    platform: 'google',
                    externalAccountId: 'google-account-linked', // A more complete flow might query accessibleCustomers
                    accessToken: access_token,
                    refreshToken: refresh_token || null,
                    tokenExpiry: new Date(Date.now() + (expires_in || 3600) * 1000)
                }
            });
            res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/marketing-integrations?success=google`);
        }
        catch (e) {
            console.error('Google OAuth Error:', ((_a = e.response) === null || _a === void 0 ? void 0 : _a.data) || e.message);
            res.status(500).send('Callback Failed: ' + (((_c = (_b = e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error_description) || e.message));
        }
    });
}
// ==========================================
// Account Discovery & Selection
// ==========================================
function getIntegrationStatus(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { clientId } = req.query;
        if (!clientId)
            return res.status(400).send('clientId is required');
        try {
            const accounts = yield prisma_1.default.marketingAccount.findMany({
                where: { clientId: clientId },
                select: {
                    platform: true,
                    externalAccountId: true,
                    accessToken: true
                }
            });
            const status = {
                meta: accounts.find((a) => a.platform === 'meta'),
                google: accounts.find((a) => a.platform === 'google')
            };
            res.json(status);
        }
        catch (e) {
            console.error('Status Check Error:', e.message);
            res.status(500).json({ message: 'Failed to check status', error: e.message });
        }
    });
}
function getAvailableAccounts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const { id: userId } = req.user;
        const { clientId, platform } = req.query;
        if (!clientId || !platform)
            return res.status(400).send('clientId and platform are required');
        try {
            if (platform === 'meta') {
                const accounts = yield metaService.fetchAccounts(userId, clientId);
                return res.json(accounts);
            }
            const account = yield prisma_1.default.marketingAccount.findFirst({
                where: { clientId: clientId, platform: platform }
            });
            if (!account)
                return res.status(404).json({ message: 'No connected account found for this client and platform.' });
            // Sandbox Check (Google/Other)
            if (((_a = account.accessToken) === null || _a === void 0 ? void 0 : _a.startsWith('mock-')) || account.accessToken === 'sandbox') {
                const mockAccounts = [
                    { id: '123-456-7890', name: 'Sandbox Google Ads A' },
                    { id: '098-765-4321', name: 'Sandbox Google Ads B' }
                ];
                return res.json(mockAccounts);
            }
            // Real API Calls for Google
            if (platform === 'google') {
                // Placeholder: Google Ads customer discovery usually happens during OAuth or via specific service
                return res.json([{ id: account.externalAccountId, name: 'Google Ads Account' }]);
            }
            res.status(400).send('Unsupported platform');
        }
        catch (e) {
            console.error('Fetch Accounts Error:', ((_b = e.response) === null || _b === void 0 ? void 0 : _b.data) || e.message);
            res.status(500).json({ message: 'Failed to fetch available accounts', error: e.message });
        }
    });
}
function selectAccount(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { clientId, platform, externalAccountId } = req.body;
        if (!clientId || !platform || !externalAccountId) {
            return res.status(400).send('clientId, platform, and externalAccountId are required');
        }
        try {
            console.log(`[DEBUG selectAccount] Received Request:`, req.body);
            // Use findFirst + create/update or upsert if possible with composite unique (which we don't have yet)
            // Since we don't have a unique constraint on (clientId, platform), we check first
            const existing = yield prisma_1.default.marketingAccount.findFirst({
                where: { clientId, platform }
            });
            console.log(`[DEBUG selectAccount] Existing Account Found:`, !!existing);
            if (existing) {
                // If the ID is changing, delete old campaigns to avoid data mixing
                if (existing.externalAccountId !== externalAccountId) {
                    console.log(`[DEBUG selectAccount] ID changed from ${existing.externalAccountId} to ${externalAccountId}. Deleting old campaigns.`);
                    // Fetch the campaigns to be deleted to get their IDs
                    const oldCampaigns = yield prisma_1.default.marketingCampaign.findMany({
                        where: { clientId, platform },
                        select: { id: true }
                    });
                    const oldCampaignIds = oldCampaigns.map((c) => c.id);
                    if (oldCampaignIds.length > 0) {
                        // Delete metrics first to satisfy foreign key constraints
                        yield prisma_1.default.marketingMetric.deleteMany({
                            where: { campaignId: { in: oldCampaignIds } }
                        });
                        console.log(`[DEBUG selectAccount] Deleted metrics for ${oldCampaignIds.length} old campaigns.`);
                        // Now safe to delete campaigns
                        yield prisma_1.default.marketingCampaign.deleteMany({
                            where: { id: { in: oldCampaignIds } }
                        });
                    }
                }
                const updated = yield prisma_1.default.marketingAccount.update({
                    where: { id: existing.id },
                    data: {
                        externalAccountId
                        // WE DO NOT CLEAR accessToken HERE.
                        // The token is tied to the user's Facebook account, not the specific Ad Account ID.
                    }
                });
                console.log(`[DEBUG selectAccount] Update successful. New externalAccountId in DB:`, updated.externalAccountId);
            }
            else {
                const created = yield prisma_1.default.marketingAccount.create({
                    data: { clientId, platform, externalAccountId }
                });
                console.log(`[DEBUG selectAccount] Create successful. New externalAccountId in DB:`, created.externalAccountId);
            }
            console.log(`[DEBUG selectAccount] Sending success response for ID:`, externalAccountId);
            res.json({ message: 'Account selected successfully', externalAccountId });
        }
        catch (e) {
            console.error('Select Account Error:', e.message);
            res.status(500).json({ message: 'Failed to select account', error: e.message });
        }
    });
}
function disconnectAccount(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { clientId, platform } = req.body;
        if (!clientId || !platform)
            return res.status(400).send('clientId and platform are required');
        try {
            yield prisma_1.default.marketingAccount.deleteMany({
                where: { clientId, platform }
            });
            res.json({ message: 'Account disconnected successfully' });
        }
        catch (e) {
            console.error('Disconnect Error:', e.message);
            res.status(500).json({ message: 'Failed to disconnect account', error: e.message });
        }
    });
}
exports.middleware = [featureEnabled];
// ==== META LEADS ====
function getLeads(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { clientId, from, to } = req.query;
        try {
            const whereClause = {};
            if (clientId) {
                whereClause.client_id = clientId;
            }
            if (from || to) {
                const dateFilter = {};
                if (from)
                    dateFilter.gte = new Date(from);
                if (to) {
                    const toDate = new Date(to);
                    toDate.setHours(23, 59, 59, 999);
                    dateFilter.lte = toDate;
                }
                whereClause.date = dateFilter;
            }
            const leads = yield prisma_1.default.lead.findMany({
                where: whereClause,
                orderBy: { date: 'desc' },
                include: {
                    marketingCampaign: { select: { name: true } },
                    follow_ups: { orderBy: { date: 'desc' } }
                }
            });
            res.json(leads);
        }
        catch (e) {
            console.error('getLeads error:', e.message);
            res.status(500).json({ message: 'Failed to fetch leads', error: e.message });
        }
    });
}
function createLead(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { clientId, name, phone, email, location, campaign_name, campaignId, quality, status } = req.body;
        if (!clientId)
            return res.status(400).json({ message: 'clientId is required' });
        try {
            const lead = yield prisma_1.default.lead.create({
                data: {
                    client_id: clientId,
                    source: 'MANUAL',
                    name,
                    phone,
                    email,
                    location,
                    campaign_name,
                    campaignId: campaignId || null,
                    quality: quality || 'MEDIUM',
                    status: status || 'NEW',
                    date: new Date()
                }
            });
            res.json(lead);
        }
        catch (e) {
            console.error('createLead error:', e.message);
            res.status(500).json({ message: 'Failed to create lead', error: e.message });
        }
    });
}
function updateLead(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        const data = req.body;
        try {
            const lead = yield prisma_1.default.lead.update({
                where: { id },
                data: Object.assign(Object.assign({}, data), { updatedAt: new Date() })
            });
            res.json(lead);
        }
        catch (e) {
            console.error('updateLead error:', e.message);
            res.status(500).json({ message: 'Failed to update lead', error: e.message });
        }
    });
}
function deleteLead(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        try {
            yield prisma_1.default.lead.delete({ where: { id } });
            res.json({ message: 'Lead deleted successfully' });
        }
        catch (e) {
            console.error('deleteLead error:', e.message);
            res.status(500).json({ message: 'Failed to delete lead', error: e.message });
        }
    });
}
function addFollowUp(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { leadId, status, notes, channel } = req.body;
        if (!leadId)
            return res.status(400).json({ message: 'leadId is required' });
        try {
            // Get current follow up count for this lead
            const count = yield prisma_1.default.leadFollowUp.count({ where: { lead_id: leadId } });
            const followUp = yield prisma_1.default.leadFollowUp.create({
                data: {
                    lead_id: leadId,
                    status,
                    notes,
                    channel: channel || 'Phone Call',
                    follow_up_number: count + 1,
                    date: new Date()
                }
            });
            // Also update the main lead status if provided
            if (status) {
                yield prisma_1.default.lead.update({
                    where: { id: leadId },
                    data: { status, updatedAt: new Date() }
                });
            }
            res.json(followUp);
        }
        catch (e) {
            console.error('addFollowUp error:', e.message);
            res.status(500).json({ message: 'Failed to add follow up', error: e.message });
        }
    });
}
function syncLeads(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { clientId } = req.body;
        if (!clientId)
            return res.status(400).json({ message: 'clientId is required' });
        try {
            const account = yield prisma_1.default.marketingAccount.findFirst({
                where: {
                    clientId,
                    platform: 'meta',
                    OR: [
                        { accessToken: { not: null } },
                        { metaTokenId: { not: null } }
                    ]
                }
            });
            if (!account) {
                return res.status(404).json({ message: 'No connected Meta account or profile found for this client' });
            }
            const result = yield metaLeadsService.syncLeads(clientId, account.externalAccountId);
            res.json(Object.assign({ message: 'Leads synced successfully' }, result));
        }
        catch (e) {
            console.error('syncLeads error:', e.message);
            res.status(500).json({ message: 'Failed to sync leads', error: e.message });
        }
    });
}
