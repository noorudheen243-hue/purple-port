import { Request, Response } from 'express';
import * as ingestionWorker from './workers/ingest';
import * as ingestionService from './service';

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

export const getStats = async (req: Request, res: Response) => {
    try {
        // Default to last 30 days if not specified
        const start = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = req.query.end ? new Date(req.query.end as string) : new Date();

        const stats = await ingestionService.getAggregatedStats(start, end);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
