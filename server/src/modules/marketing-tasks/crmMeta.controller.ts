import { Request, Response } from 'express';
import prisma from '../../utils/prisma';
import { MetaAdsService } from './services/metaAdsService';

const metaAdsService = new MetaAdsService();

// Helper to validate and get client context
const getValidatedClientId = (req: Request): string | null => {
    if (req.crmUser) {
        return req.crmUser.client_id;
    }
    const user = req.user as any;
    if (!user) return null;
    const requestedClientId = req.query.clientId as string || req.body.clientId as string || req.body.client_id as string;
    if (!requestedClientId) return null;
    if (user.role === 'CLIENT') {
        if (requestedClientId !== user.linked_client_id) return null;
    }
    return requestedClientId;
};

export const connectMetaAccount = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { accountId, accessToken } = req.body;
        if (!accountId) return res.status(400).json({ message: 'accountId is required' });

        // Update or create MarketingAccount for this client
        let marketingAccount = await prisma.marketingAccount.findFirst({
            where: { clientId, platform: 'meta' }
        });

        if (marketingAccount) {
            marketingAccount = await prisma.marketingAccount.update({
                where: { id: marketingAccount.id },
                data: {
                    externalAccountId: accountId,
                    accessToken: accessToken || marketingAccount.accessToken
                }
            });
        } else {
            marketingAccount = await prisma.marketingAccount.create({
                data: {
                    clientId,
                    platform: 'meta',
                    externalAccountId: accountId,
                    accessToken: accessToken || null
                }
            });
        }

        res.json({ message: 'Meta Account connected successfully', account: marketingAccount });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMetaAccounts = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const systemUserId = (req as any).user?.id || 'SYSTEM'; // MetaAdsService might use this for fallback
        const accounts = await metaAdsService.fetchAccounts(systemUserId, clientId);
        res.json(accounts);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMetaCampaigns = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { accountId } = req.query;
        if (!accountId) return res.status(400).json({ message: 'accountId query param is required' });

        const campaigns = await metaAdsService.fetchCampaignsDetailed(accountId as string);
        
        // Also fetch lifetime metrics to enrich the campaign list
        const enrichedCampaigns = await Promise.all(campaigns.map(async (camp: any) => {
            try {
                const metrics = await metaAdsService.fetchLifetimeMetrics(camp.id, accountId as string);
                const lifetimeData = metrics && metrics.length > 0 ? metrics[0] : null;
                return {
                    ...camp,
                    insights: lifetimeData
                };
            } catch (err) {
                return camp;
            }
        }));

        res.json(enrichedCampaigns);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMetaAdSets = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { id: campaignId } = req.params;
        const { accountId } = req.query;
        if (!accountId) return res.status(400).json({ message: 'accountId query param is required' });

        const adSets = await metaAdsService.fetchAdSets(campaignId, accountId as string);
        res.json(adSets);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMetaAds = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { id: adSetId } = req.params;
        const { accountId } = req.query;
        if (!accountId) return res.status(400).json({ message: 'accountId query param is required' });

        const ads = await metaAdsService.fetchAds(adSetId, accountId as string);
        res.json(ads);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createMetaCampaign = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { accountId, name, objective, status } = req.body;
        if (!accountId || !name || !objective) {
            return res.status(400).json({ message: 'accountId, name, and objective are required' });
        }

        const campaign = await metaAdsService.createCampaign(accountId, { name, objective, status });
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createMetaAdSet = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { accountId, ...adSetData } = req.body;
        if (!accountId || !adSetData.campaign_id || !adSetData.name || !adSetData.daily_budget) {
            return res.status(400).json({ message: 'accountId, campaign_id, name, and daily_budget are required' });
        }

        const adSet = await metaAdsService.createAdSet(accountId, adSetData);
        res.json(adSet);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateMetaStatus = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { id } = req.params;
        const { accountId, status } = req.body;
        
        if (!accountId || !status) return res.status(400).json({ message: 'accountId and status are required' });

        const result = await metaAdsService.updateStatus(id, accountId, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
