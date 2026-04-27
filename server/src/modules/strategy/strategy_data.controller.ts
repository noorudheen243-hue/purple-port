import { Request, Response } from 'express';
import { StrategyDataService } from './strategy_data.service';

export class StrategyDataController {
    static async createMaster(req: Request, res: Response) {
        try {
            const { clientId, strategy_name, strategy_id, status } = req.body;
            if (!clientId || !strategy_name) {
                return res.status(400).json({ message: 'Client ID and Strategy Name are required' });
            }
            const result = await StrategyDataService.upsertMaster(clientId, { strategy_name, strategy_id, status });
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async saveSection(req: Request, res: Response) {
        try {
            const { masterId, sectionName, data } = req.body;
            if (!masterId || !sectionName || !data) {
                return res.status(400).json({ message: 'Master ID, Section Name, and Data are required' });
            }
            const result = await StrategyDataService.saveSection(masterId, sectionName, data);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async listMasters(req: Request, res: Response) {
        try {
            const { clientId } = req.query;
            const result = await StrategyDataService.listMasters(clientId as string);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getFullData(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await StrategyDataService.getFullData(id);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const result = await StrategyDataService.updateStatus(id, status);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteMaster(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await StrategyDataService.deleteMaster(id);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async bulkDelete(req: Request, res: Response) {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids)) {
                return res.status(400).json({ message: 'IDs array is required' });
            }
            await StrategyDataService.bulkDeleteMasters(ids);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}
