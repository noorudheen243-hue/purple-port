import { Request, Response } from 'express';
import { AiSalesEngineService } from '../services/aiSalesEngine.service';
import { DealService } from '../services/deal.service';

export const getDeals = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.query;
        const deals = await DealService.getDeals(clientId as string);
        res.json(deals);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createDeal = async (req: Request, res: Response) => {
    try {
        const deal = await DealService.createDeal(req.body);
        res.status(201).json(deal);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateDeal = async (req: Request, res: Response) => {
    try {
        const deal = await DealService.updateDeal(req.params.id, req.body);
        res.json(deal);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getDealById = async (req: Request, res: Response) => {
    try {
        const deal = await DealService.getDealById(req.params.id);
        res.json(deal);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const calculateLeadScore = async (req: Request, res: Response) => {
    try {
        const score = await AiSalesEngineService.calculateLeadScore(req.params.leadId);
        res.json(score);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.query;
        const forecast = await AiSalesEngineService.getRevenueForecast(clientId as string);
        // You could aggregate more stats here
        res.json({
            forecast,
            // Add more insights as needed
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const runFullAnalytics = async (req: Request, res: Response) => {
    try {
        await AiSalesEngineService.generateSuggestions();
        const forecast = await AiSalesEngineService.getRevenueForecast();
        res.json({ message: 'Analytics completed', forecast });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
