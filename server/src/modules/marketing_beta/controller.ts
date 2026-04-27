import { Request, Response } from 'express';
import * as betaService from './service';

export const syncCampaigns = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.body;
        const result = await betaService.syncBetaCampaigns(clientId);
        res.status(200).json({ message: 'Campaigns synced successfully', data: result });
    } catch (error: any) {
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
};

export const getCampaigns = async (req: Request, res: Response) => {
    try {
        const { clientId, groupId } = req.query;
        const data = await betaService.getBetaCampaigns(clientId as string, groupId as string);
        res.status(200).json(data);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch campaigns', error: error.message });
    }
};

export const getInsights = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.query;
        const data = await betaService.getBetaInsights(clientId as string);
        res.status(200).json(data);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch insights', error: error.message });
    }
};

export const getAutomations = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.query;
        const data = await betaService.getBetaAutomations(clientId as string);
        res.status(200).json(data);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch automations', error: error.message });
    }
};

export const getGroups = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.query;
        if (!clientId) return res.status(400).json({ message: 'clientId is required' });
        const data = await betaService.getMarketingGroups(clientId as string);
        res.status(200).json(data);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch groups', error: error.message });
    }
};
