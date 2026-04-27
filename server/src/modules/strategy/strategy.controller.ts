import { Request, Response } from 'express';
import { StrategyService } from './strategy.service';

export class StrategyController {
    static async getFullStrategy(req: Request, res: Response) {
        try {
            const { clientId } = req.params;
            const strategy = await StrategyService.getFullStrategy(clientId);
            res.json({ success: true, ...strategy });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async saveInputs(req: Request, res: Response) {
        try {
            const { clientId } = req.params;
            const input = await StrategyService.saveInputs(clientId, req.body);
            res.json({ success: true, input });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getMarketInputs(req: Request, res: Response) {
        try {
            const { clientId } = req.params;
            const marketInput = await StrategyService.getMarketInputs(clientId);
            res.json({ success: true, marketInput });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async saveMarketInputs(req: Request, res: Response) {
        try {
            const { clientId } = req.params;
            const marketInput = await StrategyService.saveMarketInputs(clientId, req.body);
            res.json({ success: true, marketInput });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async generateStrategy(req: Request, res: Response) {
        try {
            const { clientId } = req.params;
            const result = await StrategyService.generateStrategy(clientId);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async autoSuggest(req: Request, res: Response) {
        try {
            const { clientId } = req.params;
            const { step } = req.body;
            const suggestion = await StrategyService.autoSuggestStep(clientId, step);
            res.json({ success: true, suggestion });
        } catch (error: any) {
            console.error('[AUTO_SUGGEST_CONTROLLER_ERROR]', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async saveVersion(req: Request, res: Response) {
        try {
            const { clientId } = req.params;
            const { name } = req.body;
            const version = await StrategyService.saveVersion(clientId, name);
            res.json({ success: true, version });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async listVersions(req: Request, res: Response) {
        try {
            const { clientId } = req.query;
            const versions = await StrategyService.listAllVersions(clientId as string);
            res.json({ success: true, versions });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteVersion(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await StrategyService.deleteVersion(id);
            res.json({ success: true, message: 'Version deleted' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getVersion(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const version = await StrategyService.getVersion(id);
            res.json({ success: true, version });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
