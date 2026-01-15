import { Request, Response } from 'express';
import * as ingestionWorker from './workers/ingest';
import * as ingestionService from './service';
import * as metaService from './meta.service';
import prisma from '../../utils/prisma';

export const triggerSync = async (req: Request, res: Response) => {
    try {
        const result = await ingestionWorker.runIngestionJob();
        res.json({ message: 'Sync complete', result });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getLinkedAccounts = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        const accounts = await ingestionService.getLinkedAdAccounts(clientId);
        res.json(accounts);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- META INTEGRATION ---

export const getMetaAuthUrl = (req: Request, res: Response) => {
    // Generate URL for user to click
    const { redirectUri } = req.query;
    const url = metaService.getAuthUrl(redirectUri as string, process.env.META_APP_ID || '', 'some_random_state');
    res.json({ url });
};

export const handleMetaCallback = async (req: Request, res: Response) => {
    try {
        const { code, redirectUri } = req.body;
        // Exchange code
        const tokenData = await metaService.exchangeCodeForToken(code, redirectUri);

        // Save to User
        await metaService.storeUserToken(req.user!.id, tokenData);

        res.json({ message: "Meta Connected Successfully", user_id: req.user!.id });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const listRemoteAdAccounts = async (req: Request, res: Response) => {
    try {
        // Get User's Token
        const token = await prisma.metaToken.findUnique({ where: { user_id: req.user!.id } });
        if (!token) return res.status(404).json({ message: "No Meta Account Connected" });

        const accounts = await metaService.fetchAdAccounts(token.access_token);
        res.json(accounts);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const linkAdAccount = async (req: Request, res: Response) => {
    try {
        const { clientId, name, externalId, platform } = req.body; // platform="META"

        const account = await prisma.adAccount.create({
            data: {
                client_id: clientId,
                name: name,
                external_id: externalId, // e.g. act_123 -> external_id
                platform: platform,
                status: 'ACTIVE'
            }
        });

        // If immediate sync desired:
        // const token = ... get user token
        // await metaService.syncCampaignsForAccount(account.id, externalId, token.access_token);

        res.json(account);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const syncAdAccount = async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const account = await prisma.adAccount.findUnique({ where: { id: accountId } });
        if (!account) return res.status(404).json({ message: "Account not found" });

        // Security: Does this user have access? 
        // Admin or Manager.

        // Use Linked User Token (Assumption: User who connected is the one triggering or we use system generic?)
        // Complex part: AdAccount is linked to Client. MetaToken is linked to User.
        // If I (Admin) click Sync, I use MY token. If I don't have access to that ad account, it fails.
        // OR we store `meta_token_id` on AdAccount? Model didn't do that yet.
        // Fallback: Try req.user's token.

        const token = await prisma.metaToken.findUnique({ where: { user_id: req.user!.id } });
        if (!token) return res.status(403).json({ message: "Please connect your Meta Account first." });

        const result = await metaService.syncCampaignsForAccount(account.id, account.external_id, token.access_token);
        res.json({ synced: result });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCampaigns = async (req: Request, res: Response) => {
    // Return DB Campaigns
    try {
        const { adAccountId } = req.params;
        const campaigns = await prisma.adCampaign.findMany({
            where: { ad_account_id: adAccountId },
            include: { insights: true }, // Include latest insight?
            orderBy: { createdAt: 'desc' }
        });
        res.json(campaigns);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- EXISTING ---


export const getStats = async (req: Request, res: Response) => {
    try {
        // Default to last 30 days if not specified
        const start = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = req.query.end ? new Date(req.query.end as string) : new Date();

        const clientId = req.user?.role === 'CLIENT' ? (req.user as any).linked_client_id : undefined;
        const stats = await ingestionService.getAggregatedStats(start, end, clientId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
