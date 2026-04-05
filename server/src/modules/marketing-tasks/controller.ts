import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { format } from 'date-fns';
import prisma from '../../utils/prisma';
import { MetaAdsService } from './services/metaAdsService';
import { GoogleAdsService } from './services/googleAdsService';
import { MetaLeadsService } from './services/metaLeadsService';
import { MarketingSyncWorker } from './sync/syncWorker';

const metaService = new MetaAdsService();
const googleService = new GoogleAdsService();
const metaLeadsService = new MetaLeadsService();

// Simple feature flag check
function featureEnabled(req: Request, res: Response, next: NextFunction) {
    if (process.env.MARKETING_ENGINE_ENABLED !== 'true') {
        return res.status(403).json({ message: 'Marketing engine feature is disabled.' });
    }
    next();
}

export async function manualSync(req: Request, res: Response) {
    try {
        // Explicitly calculate days back to January 1st of the current year
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const today = new Date();
        const daysToCurrentYear = Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 3600 * 24)) + 1; // +1 to be inclusive

        // Trigger sync asynchronously for the current year
        MarketingSyncWorker.syncAllActiveCampaigns(daysToCurrentYear).catch(err => {
            console.error('Background Marketing Sync Error 2026/Current Year:', err);
        });
        
        res.json({ message: `Sync started successfully. Fetching ${daysToCurrentYear} days of history for the current year in the background. This may take a few minutes.` });
    } catch (error) {
        console.error('Marketing Sync Error:', error);
        res.status(500).json({ message: 'Sync failed', error: (error as Error).message });
    }
}

export async function syncCampaign(req: Request, res: Response) {
    try {
        const { campaignId, daysBack, isPreview, externalAccountId, platform, clientId: bodyClientId } = req.body;
        if (!campaignId) return res.status(400).json({ message: 'campaignId is required' });

        // Ensure we have a valid clientId
        const clientId = bodyClientId || (req as any).query.clientId;
        if (!clientId) {
            return res.status(400).json({ message: 'clientId is required for synchronization' });
        }

        if (isPreview && externalAccountId && platform) {
            const today = new Date();
            
            // 1. Fetch metadata first to find the true campaign start date
            let campaignMetadata: any = null;
            if (platform === 'meta') {
                const metaCampaigns = await metaService.fetchCampaigns(externalAccountId);
                // Use robust string comparison to avoid large-number precision issues
                campaignMetadata = metaCampaigns.find(c => String(c.id) === String(campaignId));
            } else if (platform === 'google') {
                const googleCampaigns = await googleService.fetchCampaigns(externalAccountId);
                campaignMetadata = googleCampaigns.find(c => String(c.id) === String(campaignId));
            }

            // Determine Start Date (Lifetime)
            let startDate = new Date();
            const rawStart = campaignMetadata?.start_time || campaignMetadata?.start_date || campaignMetadata?.startDate;
            if (rawStart) {
                startDate = new Date(rawStart);
            } else {
                // Fallback to 2 years ago for true "Lifetime" if start unknown
                startDate.setFullYear(today.getFullYear() - 2);
            }
            startDate.setHours(0, 0, 0, 0);

            // Determine End Date
            let endDate = null;
            const rawEnd = campaignMetadata?.stop_time || campaignMetadata?.end_date || campaignMetadata?.endDate;
            if (rawEnd) {
                endDate = new Date(rawEnd);
            }

            console.log(`[SyncController] Syncing ${platform} Campaign: ${campaignId} (Client: ${clientId}) from ${startDate.toISOString()}`);
            
            let externalMetrics: any[] = [];
            if (platform === 'meta') {
                externalMetrics = await metaService.fetchMetrics(campaignId, externalAccountId, startDate, today);
            } else if (platform === 'google') {
                externalMetrics = await googleService.fetchMetrics(campaignId, externalAccountId, startDate, today);
            }

            console.log(`[SyncController] Fetched ${externalMetrics.length} metric rows.`);

            // 2. Aggregate Metrics (Sum everything for a Lifetime total)
            const totals = externalMetrics.reduce((acc, curr) => {
                acc.spend += parseFloat(curr.spend || 0);
                acc.results += parseInt(curr.results || curr.conversions || 0);
                acc.impressions += parseInt(curr.impressions || 0);
                acc.reach += parseInt(curr.reach || 0);
                acc.messaging_conversations += parseInt(curr.messaging_conversations || 0);
                acc.new_messaging_contacts += parseInt(curr.new_messaging_contacts || 0);
                acc.purchases += parseInt(curr.purchases || 0);
                return acc;
            }, {
                spend: 0, results: 0, impressions: 0, reach: 0,
                messaging_conversations: 0, new_messaging_contacts: 0, purchases: 0
            });

            // Ensure the campaign is registered in our system for tracking
            let campRecord = await (prisma as any).marketingCampaign.findFirst({
                where: { 
                    externalCampaignId: String(campaignId),
                    platform: platform.toLowerCase(),
                    clientId: clientId
                }
            });

            if (campRecord) {
                campRecord = await (prisma as any).marketingCampaign.update({
                    where: { id: campRecord.id },
                    data: {
                        name: campaignMetadata?.name || campaignMetadata?.title,
                        status: campaignMetadata?.effective_status || campaignMetadata?.status,
                        objective: campaignMetadata?.objective,
                        budget: parseFloat(campaignMetadata?.daily_budget || campaignMetadata?.lifetime_budget || '0') / 100,
                        startDate: startDate,
                        ends: endDate
                    }
                });
            } else {
                campRecord = await (prisma as any).marketingCampaign.create({
                    data: {
                        clientId: clientId,
                        platform: platform.toLowerCase(),
                        externalCampaignId: String(campaignId),
                        name: campaignMetadata?.name || campaignMetadata?.title,
                        status: campaignMetadata?.effective_status || campaignMetadata?.status,
                        objective: campaignMetadata?.objective,
                        budget: parseFloat(campaignMetadata?.daily_budget || campaignMetadata?.lifetime_budget || '0') / 100,
                        startDate: startDate,
                        ends: endDate
                    }
                });
            }

            // Aggregate and update metrics
            const latestMetric = {
                ...totals,
                results_cost: totals.results > 0 ? totals.spend / totals.results : 0,
                // Automated fields
                name: campaignMetadata?.name || campaignMetadata?.title,
                startDate: startDate,
                ends: endDate,
                status: campaignMetadata?.effective_status || campaignMetadata?.status,
                id: campRecord.id // Include our internal ID for saving
            };

            return res.json({ success: true, latestMetric });
        }

        const latestMetric = await MarketingSyncWorker.syncSingleCampaign(campaignId, daysBack || 7);
        res.json({ success: true, latestMetric });
    } catch (error: any) {
        console.error('Single Campaign Sync Error:', error.message);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
}

export async function getMetaAccountStatus(req: Request, res: Response) {
    try {
        const { clientId } = req.query;
        if (!clientId) return res.status(400).json({ message: 'clientId is required' });

        const account = await (prisma as any).marketingAccount.findFirst({
            where: { clientId: clientId as string, platform: 'meta' },
            include: { metaToken: true }
        });

        if (!account) {
            return res.json({ connected: false, status: 'NOT_CONNECTED' });
        }

        // AUTO-FIX: If the ID has leading/trailing spaces, fix it in the DB immediately
        if (account.externalAccountId && account.externalAccountId !== account.externalAccountId.trim()) {
            const trimmed = account.externalAccountId.trim();
            console.log(`[FIX] Trimming whitespace for Meta ID: "${account.externalAccountId}" -> "${trimmed}"`);
            await (prisma as any).marketingAccount.update({
                where: { id: account.id },
                data: { externalAccountId: trimmed }
            });
            account.externalAccountId = trimmed;
        }

        // Check token health
        const now = new Date();
        const isExpired = account.tokenExpiry && new Date(account.tokenExpiry) < now;
        const profileExpired = account.metaToken?.expires_at && new Date(account.metaToken.expires_at) < now;

        if (isExpired || profileExpired) {
            return res.json({ connected: true, status: 'EXPIRED', accountName: account.metaToken?.account_name });
        }

        // Fetch campaigns if active
        let campaigns: any[] = [];
        let status = 'ACTIVE';
        let errorMessage = '';

        console.log(`[DEBUG getMetaAccountStatus] Client: ${clientId}, AdAccount: ${account.externalAccountId}`);
        
        try {
            if (account.externalAccountId && account.externalAccountId !== 'meta-account-linked' && account.externalAccountId !== 'pending-selection') {
                campaigns = await metaService.fetchCampaigns(account.externalAccountId);
                console.log(`[DEBUG getMetaAccountStatus] Fetched ${campaigns.length} campaigns for ${account.externalAccountId}`);
            } else {
                console.log(`[DEBUG getMetaAccountStatus] Skipping fetch: externalAccountId is placeholder (${account.externalAccountId})`);
            }
        } catch (err: any) {
            console.error('[DEBUG getMetaAccountStatus] Error fetching Meta campaigns:', err.message);
            // Handle Meta API errors specifically
            const fbError = err.response?.data?.error;
            if (fbError) {
                if (fbError.code === 190 || fbError.type === 'OAuthException') {
                    status = 'EXPIRED';
                    errorMessage = fbError.message;
                } else if (fbError.code === 200) {
                    status = 'PERMISSION_ERROR';
                    errorMessage = fbError.message;
                }
            }
        }

        res.json({ 
            connected: true, 
            status, 
            errorMessage,
            accountName: account.metaToken?.account_name,
            externalAccountId: account.externalAccountId,
            campaigns // Return campaigns to populate dropdown
        });
    } catch (error: any) {
        res.status(500).json({ connected: false, status: 'ERROR', error: error.message });
    }
}


export async function getMetrics(req: Request, res: Response) {
    try {
        const { clientId, platform, from, to, status } = req.query;

        if (!from || !to) {
            return res.status(400).json({ message: 'from and to dates are required.' });
        }

        const dateFilter = {
            gte: new Date(from as string),
            lte: new Date(to as string)
        };

        const whereClause: any = {
            date: dateFilter
        };

        if (clientId) {
            whereClause.campaign = {
                clientId: clientId as string
            };
        } else {
            // Ensure we are only getting metrics for campaigns that HAVE a client
            whereClause.campaign = {
                clientId: { not: '' }
            };
        }

        if (platform) {
            if (!whereClause.campaign) whereClause.campaign = {};
            whereClause.campaign.platform = platform as string;
        }

        if (status === 'active') {
            if (!whereClause.campaign) whereClause.campaign = {};
            whereClause.campaign.status = { in: ['ACTIVE', 'ENABLED'] };
        } else if (status === 'all') {
            if (!whereClause.campaign) whereClause.campaign = {};
            // Include everything that isn't deleted/unknown
            whereClause.campaign.status = { in: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'ENABLED'] };
        }

        const metrics = await (prisma as any).marketingMetric.findMany({
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
        const summary = metrics.reduce((acc: any, curr: any) => {
            acc.impressions += (curr.impressions || 0);
            acc.clicks += (curr.clicks || 0);
            acc.spend += (curr.spend || 0);
            acc.conversions += (curr.conversions || 0);
            acc.reach += (curr.reach || 0);
            acc.results += (curr.results || 0);
            acc.conversations += (curr.conversations || 0);
            return acc;
        }, { impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0, results: 0, conversations: 0 });

        // NEW: Fetch ALL relevant campaigns to return to UI (Ensures 66+ show up even with 0 metrics)
        const campaignWhere: any = { clientId: clientId as string };
        if (platform) campaignWhere.platform = platform as string;
        
        if (status === 'active') {
            campaignWhere.status = { in: ['ACTIVE', 'ENABLED'] };
        } else if (status === 'all') {
            campaignWhere.status = { in: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'ENABLED'] };
        }

        const allCampaigns = await (prisma as any).marketingCampaign.findMany({
            where: campaignWhere,
            select: {
                id: true,
                name: true,
                platform: true,
                objective: true,
                status: true
            }
        });

        res.json({
            summary,
            data: metrics,
            campaigns: allCampaigns
        });
    } catch (error) {
        console.error('Error fetching marketing metrics:', error);
        res.status(500).json({ message: 'Error fetching metrics', error: (error as Error).message });
    }
}

export async function getAiTips(req: Request, res: Response) {
    try {
        const { clientId } = req.query;
        if (!clientId) return res.status(400).json({ message: 'clientId is required.' });
        const tips = await require('./services/marketingAiService').MarketingAIService.generateTips(clientId as string);
        res.json(tips);
    } catch (error) {
        console.error('Error generating AI tips:', error);
        res.status(500).json({ message: 'Error generating tips', error: (error as Error).message });
    }
}

// ==========================================
// OAuth 2.0 Integration Handlers
// ==========================================

export async function authMeta(req: Request, res: Response) {
    const { clientId } = req.query; // clientId is optional now for global profile linking
    const state = clientId || 'global';

    // Load credentials from DB first, fallback to ENV
    const settings = await (prisma as any).systemSetting.findMany({
        where: { key: { in: ['META_APP_ID', 'META_APP_SECRET'] } }
    });

    const settingsMap = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    const appId = settingsMap['META_APP_ID'] || process.env.META_APP_ID;
    const redirectUri = `${process.env.API_URL || 'http://localhost:4001'}/api/marketing/auth/meta/callback`;

    if (!appId) {
        return res.status(400).send('Meta App ID is not configured. Please set it in Settings first.');
    }

    // Redirect to Facebook Dialog with reauthenticate to allow switching accounts easily
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=ads_management,ads_read,business_management,leads_retrieval,pages_manage_ads,pages_read_engagement&auth_type=reauthenticate`;
    res.redirect(authUrl);
}

export async function metaCallback(req: Request, res: Response) {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Missing code or state');

    const clientId = state === 'global' ? null : state as string;
    
    // Fallback if no user in req (for testing/local or redirect bounce)
    let userId = (req as any).user?.id;
    if (!userId) {
        const adminUser = await (prisma as any).user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true }
        });
        if (!adminUser) {
            return res.status(500).send('No Admin user found to link this Meta account to.');
        }
        userId = adminUser.id;
    }
    try {
        const settings = await (prisma as any).systemSetting.findMany({
            where: { key: { in: ['META_APP_ID', 'META_APP_SECRET'] } }
        });
        const settingsMap = settings.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        const appId = settingsMap['META_APP_ID'] || process.env.META_APP_ID;
        const appSecret = settingsMap['META_APP_SECRET'] || process.env.META_APP_SECRET;
        const redirectUri = `${process.env.API_URL || 'http://localhost:4001'}/api/marketing/auth/meta/callback`;

        // Exchange code for short-lived token
        const tokenRes = await axios.get(`https://graph.facebook.com/v21.0/oauth/access_token`, {
            params: {
                client_id: appId,
                redirect_uri: redirectUri,
                client_secret: appSecret,
                code
            }
        });
        const shortToken = tokenRes.data.access_token;

        // Exchange for long-lived token
        const longTokenRes = await axios.get(`https://graph.facebook.com/v21.0/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: shortToken
            }
        });
        const longToken = longTokenRes.data.access_token;

        // Fetch Meta user info (Name and ID)
        const meRes = await axios.get(`https://graph.facebook.com/v21.0/me`, {
            params: { access_token: longToken, fields: 'id,name' }
        });
        const metaUserName = meRes.data.name;
        const metaUserId = meRes.data.id;

        // Bypass Prisma SQLite 'upsert' bug - Use manual find + update/create
        const existingMetaToken = await (prisma as any).metaToken.findFirst({
            where: { meta_user_id: metaUserId, user_id: userId }
        });

        let metaToken;
        if (existingMetaToken) {
            metaToken = await (prisma as any).metaToken.update({
                where: { id: existingMetaToken.id },
                data: {
                    access_token: longToken,
                    account_name: metaUserName,
                    expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                }
            });
        } else {
            metaToken = await (prisma as any).metaToken.create({
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
            const existingAccount = await (prisma as any).marketingAccount.findFirst({
                where: { clientId, platform: 'meta' }
            });

            if (existingAccount) {
                await (prisma as any).marketingAccount.update({
                    where: { id: existingAccount.id },
                    data: {
                        accessToken: longToken,
                        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                        metaTokenId: metaToken.id
                    }
                });
            } else {
                await (prisma as any).marketingAccount.create({
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
    } catch (e: any) {
        console.error('Meta OAuth Error:', e.response?.data || e.message);
        res.status(500).send('Callback Failed: ' + (e.response?.data?.error?.message || e.message));
    }
}

export async function getMetaProfiles(req: Request, res: Response) {
    try {
        const profiles = await (prisma as any).metaToken.findMany({
            where: { isActive: true },
            select: {
                id: true,
                account_name: true,
                meta_user_id: true,
                updatedAt: true,
                expires_at: true,
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

        // Compute token health status for each profile
        const now = Date.now();
        const enriched = profiles.map((p: any) => ({
            ...p,
            tokenStatus: p.expires_at && new Date(p.expires_at).getTime() < now ? 'EXPIRED' : 'ACTIVE'
        }));

        res.json(enriched);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
}

export const getAccounts = async (req: Request, res: Response) => {
    const { id } = (req as any).user;
    const { clientId } = req.query;

    try {
        const accounts = await metaService.fetchAccounts(id, clientId as string);
        res.json(accounts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export async function linkAccountToProfile(req: Request, res: Response) {
    const { clientId, profileId, externalAccountId } = req.body;
    if (!clientId || !profileId) return res.status(400).send('Missing clientId or profileId');

    try {
        const profile = await (prisma as any).metaToken.findUnique({ where: { id: profileId } });
        if (!profile) return res.status(404).send('Profile not found');

        const existingAccount = await (prisma as any).marketingAccount.findFirst({
            where: { clientId, platform: 'meta' }
        });

        if (existingAccount) {
            await (prisma as any).marketingAccount.update({
                where: { id: existingAccount.id },
                data: {
                    metaTokenId: profileId,
                    accessToken: profile.access_token,
                    externalAccountId: externalAccountId || existingAccount.externalAccountId
                }
            });
        } else {
            await (prisma as any).marketingAccount.create({
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
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
}

export async function authGoogle(req: Request, res: Response) {
    const { clientId } = req.query;
    if (!clientId) return res.status(400).send('clientId is required');

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
}

export async function googleCallback(req: Request, res: Response) {
    const { code, state: clientId } = req.query;
    if (!code || !clientId) return res.status(400).send('Missing code or clientId');

    // Sandbox Handler
    if (code === 'sandbox') {
        await (prisma as any).marketingAccount.deleteMany({
            where: { clientId: clientId as string, platform: 'google' }
        });
        await (prisma as any).marketingAccount.create({
            data: {
                clientId: clientId as string,
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

        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: googleClientId,
            client_secret: googleClientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });

        const { access_token, refresh_token, expires_in } = tokenRes.data;

        // Clean up old ones for this client
        await (prisma as any).marketingAccount.deleteMany({
            where: { clientId: clientId as string, platform: 'google' }
        });

        await (prisma as any).marketingAccount.create({
            data: {
                clientId: clientId as string,
                platform: 'google',
                externalAccountId: 'google-account-linked', // A more complete flow might query accessibleCustomers
                accessToken: access_token,
                refreshToken: refresh_token || null,
                tokenExpiry: new Date(Date.now() + (expires_in || 3600) * 1000)
            }
        });

        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/marketing-integrations?success=google`);
    } catch (e: any) {
        console.error('Google OAuth Error:', e.response?.data || e.message);
        res.status(500).send('Callback Failed: ' + (e.response?.data?.error_description || e.message));
    }
}

// ==========================================
// Account Discovery & Selection
// ==========================================

export async function getIntegrationStatus(req: Request, res: Response) {
    const { clientId } = req.query;
    if (!clientId) return res.status(400).send('clientId is required');

    try {
        const accounts = await (prisma as any).marketingAccount.findMany({
            where: { clientId: clientId as string },
            select: {
                platform: true,
                externalAccountId: true,
                accessToken: true
            }
        });

        const status = {
            meta: accounts.find((a: any) => a.platform === 'meta'),
            google: accounts.find((a: any) => a.platform === 'google')
        };

        res.json(status);
    } catch (e: any) {
        console.error('Status Check Error:', e.message);
        res.status(500).json({ message: 'Failed to check status', error: e.message });
    }
}

export async function getAvailableAccounts(req: Request, res: Response) {
    const { id: userId } = (req as any).user;
    const { clientId, platform } = req.query;
    if (!clientId || !platform) return res.status(400).send('clientId and platform are required');

    try {
        if (platform === 'meta') {
            const accounts = await metaService.fetchAccounts(userId, clientId as string);
            return res.json(accounts);
        }

        const account = await (prisma as any).marketingAccount.findFirst({
            where: { clientId: clientId as string, platform: platform as string }
        });

        if (!account) return res.status(404).json({ message: 'No connected account found for this client and platform.' });

        // Sandbox Check (Google/Other)
        if (account.accessToken?.startsWith('mock-') || account.accessToken === 'sandbox') {
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
    } catch (e: any) {
        console.error('Fetch Accounts Error:', e.response?.data || e.message);
        res.status(500).json({ message: 'Failed to fetch available accounts', error: e.message });
    }
}

export async function selectAccount(req: Request, res: Response) {
    const { clientId, platform, externalAccountId } = req.body;
    if (!clientId || !platform || !externalAccountId) {
        return res.status(400).send('clientId, platform, and externalAccountId are required');
    }

    try {
        console.log(`[DEBUG selectAccount] Received Request:`, req.body);

        // Use findFirst + create/update or upsert if possible with composite unique (which we don't have yet)
        // Since we don't have a unique constraint on (clientId, platform), we check first
        const existing = await (prisma as any).marketingAccount.findFirst({
            where: { clientId, platform }
        });

        console.log(`[DEBUG selectAccount] Existing Account Found:`, !!existing);

        if (existing) {
            // If the ID is changing, delete old campaigns to avoid data mixing
            if (existing.externalAccountId !== externalAccountId) {
                console.log(`[DEBUG selectAccount] ID changed from ${existing.externalAccountId} to ${externalAccountId}. Deleting old campaigns.`);

                // Fetch the campaigns to be deleted to get their IDs
                const oldCampaigns = await (prisma as any).marketingCampaign.findMany({
                    where: { clientId, platform },
                    select: { id: true }
                });

                const oldCampaignIds = oldCampaigns.map((c: any) => c.id);

                if (oldCampaignIds.length > 0) {
                    // Delete metrics first to satisfy foreign key constraints
                    await (prisma as any).marketingMetric.deleteMany({
                        where: { campaignId: { in: oldCampaignIds } }
                    });

                    console.log(`[DEBUG selectAccount] Deleted metrics for ${oldCampaignIds.length} old campaigns.`);

                    // Now safe to delete campaigns
                    await (prisma as any).marketingCampaign.deleteMany({
                        where: { id: { in: oldCampaignIds } }
                    });
                }
            }

            const updated = await (prisma as any).marketingAccount.update({
                where: { id: existing.id },
                data: {
                    externalAccountId
                    // WE DO NOT CLEAR accessToken HERE.
                    // The token is tied to the user's Facebook account, not the specific Ad Account ID.
                }
            });
            console.log(`[DEBUG selectAccount] Update successful. New externalAccountId in DB:`, updated.externalAccountId);
        } else {
            const created = await (prisma as any).marketingAccount.create({
                data: { clientId, platform, externalAccountId }
            });
            console.log(`[DEBUG selectAccount] Create successful. New externalAccountId in DB:`, created.externalAccountId);
        }

        console.log(`[DEBUG selectAccount] Sending success response for ID:`, externalAccountId);

        res.json({ message: 'Account selected successfully', externalAccountId });
    } catch (e: any) {
        console.error('Select Account Error:', e.message);
        res.status(500).json({ message: 'Failed to select account', error: e.message });
    }
}

export async function disconnectAccount(req: Request, res: Response) {
    const { clientId, platform } = req.body;
    if (!clientId || !platform) return res.status(400).send('clientId and platform are required');

    try {
        await (prisma as any).marketingAccount.deleteMany({
            where: { clientId, platform }
        });
        res.json({ message: 'Account disconnected successfully' });
    } catch (e: any) {
        console.error('Disconnect Error:', e.message);
        res.status(500).json({ message: 'Failed to disconnect account', error: e.message });
    }
}

export const middleware = [featureEnabled];

// ==== META LEADS ====

export async function getLeads(req: Request, res: Response) {
    const { clientId, from, to } = req.query;

    try {
        const whereClause: any = {};
        
        if (clientId) {
            whereClause.client_id = clientId as string;
        }

        if (from || to) {
            const dateFilter: any = {};
            if (from) dateFilter.gte = new Date(from as string);
            if (to) {
                const toDate = new Date(to as string);
                toDate.setHours(23, 59, 59, 999);
                dateFilter.lte = toDate;
            }
            whereClause.date = dateFilter;
        }

        const leads = await (prisma as any).lead.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            include: {
                marketingCampaign: { select: { name: true } },
                follow_ups: { orderBy: { date: 'desc' } }
            }
        });
        res.json(leads);
    } catch (e: any) {
        console.error('getLeads error:', e.message);
        res.status(500).json({ message: 'Failed to fetch leads', error: e.message });
    }
}

export async function createLead(req: Request, res: Response) {
    const { clientId, name, phone, email, location, campaign_name, campaignId, quality, status } = req.body;
    if (!clientId) return res.status(400).json({ message: 'clientId is required' });

    try {
        const lead = await (prisma as any).lead.create({
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
    } catch (e: any) {
        console.error('createLead error:', e.message);
        res.status(500).json({ message: 'Failed to create lead', error: e.message });
    }
}

export async function updateLead(req: Request, res: Response) {
    const { id } = req.params;
    const data = req.body;

    try {
        const lead = await (prisma as any).lead.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
        res.json(lead);
    } catch (e: any) {
        console.error('updateLead error:', e.message);
        res.status(500).json({ message: 'Failed to update lead', error: e.message });
    }
}

export async function deleteLead(req: Request, res: Response) {
    const { id } = req.params;

    try {
        await (prisma as any).lead.delete({ where: { id } });
        res.json({ message: 'Lead deleted successfully' });
    } catch (e: any) {
        console.error('deleteLead error:', e.message);
        res.status(500).json({ message: 'Failed to delete lead', error: e.message });
    }
}

export async function addFollowUp(req: Request, res: Response) {
    const { leadId, status, notes, channel } = req.body;
    if (!leadId) return res.status(400).json({ message: 'leadId is required' });

    try {
        // Get current follow up count for this lead
        const count = await (prisma as any).leadFollowUp.count({ where: { lead_id: leadId } });

        const followUp = await (prisma as any).leadFollowUp.create({
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
            await (prisma as any).lead.update({
                where: { id: leadId },
                data: { status, updatedAt: new Date() }
            });
        }

        res.json(followUp);
    } catch (e: any) {
        console.error('addFollowUp error:', e.message);
        res.status(500).json({ message: 'Failed to add follow up', error: e.message });
    }
}

export async function syncLeads(req: Request, res: Response) {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ message: 'clientId is required' });

    try {
        const account = await (prisma as any).marketingAccount.findFirst({
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

        const result = await metaLeadsService.syncLeads(clientId, account.externalAccountId);
        res.json({ message: 'Leads synced successfully', ...result });
    } catch (e: any) {
        console.error('syncLeads error:', e.message);
        res.status(500).json({ message: 'Failed to sync leads', error: e.message });
    }
}

// ==========================================
// META ADS MANAGER EXTENSIONS
// ==========================================

export async function getMetaCampaignsDetailed(req: Request, res: Response) {
    try {
        const { accountId } = req.query;
        if (!accountId) return res.status(400).json({ message: 'accountId is required' });
        const campaigns = await metaService.fetchCampaignsDetailed(accountId as string);
        res.json(campaigns);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
}

export async function getMetaAdSets(req: Request, res: Response) {
    try {
        const { campaignId, accountId } = req.query;
        if (!campaignId || !accountId) return res.status(400).json({ message: 'campaignId and accountId are required' });
        const adSets = await metaService.fetchAdSets(campaignId as string, accountId as string);
        res.json(adSets);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching adsets', error: error.message });
    }
}

export async function getMetaAds(req: Request, res: Response) {
    try {
        const { adSetId, accountId } = req.query;
        if (!adSetId || !accountId) return res.status(400).json({ message: 'adSetId and accountId are required' });
        const ads = await metaService.fetchAds(adSetId as string, accountId as string);
        res.json(ads);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching ads', error: error.message });
    }
}

export async function createMetaCampaign(req: Request, res: Response) {
    try {
        const { accountId, name, objective, status } = req.body;
        if (!accountId || !name || !objective) return res.status(400).json({ message: 'accountId, name, and objective are required' });
        const result = await metaService.createCampaign(accountId, { name, objective, status });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating campaign', error: error.message });
    }
}

export async function createMetaAdSet(req: Request, res: Response) {
    try {
        const { accountId, payload } = req.body;
        if (!accountId || !payload) return res.status(400).json({ message: 'accountId and payload are required' });
        const result = await metaService.createAdSet(accountId, payload);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating ad set', error: error.message });
    }
}

export async function updateMetaStatus(req: Request, res: Response) {
    try {
        const { objectId, accountId, status } = req.body;
        if (!objectId || !accountId || !status) return res.status(400).json({ message: 'objectId, accountId, and status are required' });
        const result = await metaService.updateStatus(objectId, accountId, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
}

export async function sendReport(req: Request, res: Response) {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
        return res.status(400).json({ message: 'No PDF file uploaded.' });
    }

    const { clientId } = req.body;
    if (!clientId) {
        return res.status(400).json({ message: 'clientId is required.' });
    }

    try {
        const client = await (prisma as any).client.findUnique({
            where: { id: clientId },
            select: { name: true, contact_number: true }
        });

        if (!client || !client.contact_number) {
            return res.status(404).json({ message: 'Client not found or has no contact number registered.' });
        }

        const { waEngine } = await import('../whatsapp/WhatsAppEngine');

        if (waEngine.status !== 'CONNECTED') {
            return res.status(503).json({ message: `WhatsApp engine is not connected (status: ${waEngine.status}). Please connect in Settings > WhatsApp.` });
        }

        const filename = `Qixads Report ${format(new Date(), 'dd-MM-yyyy')}.pdf`;
        const sent = await waEngine.sendDocument(client.contact_number, file.path, filename);

        const fsPromises = await import('fs/promises');
        await fsPromises.unlink(file.path).catch(() => {});

        if (sent) {
            res.json({ message: `Report sent to ${client.name} via WhatsApp.` });
        } else {
            res.status(500).json({ message: 'WhatsApp dispatch failed. Please check the connection.' });
        }
    } catch (error: any) {
        try {
            const fsPromises = await import('fs/promises');
            if (file?.path) await fsPromises.unlink(file.path).catch(() => {});
        } catch (_) {}
        console.error('[sendReport] Error:', error);
        res.status(500).json({ message: 'Failed to send report.', error: error.message });
    }
}

