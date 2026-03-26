import { Request, Response } from 'express';
import * as service from './service';

export const getApps = async (req: Request, res: Response) => {
    try {
        const apps = await service.getApps(req.user!.id);
        res.json(apps);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createApp = async (req: Request, res: Response) => {
    try {
        const app = await service.createApp(req.user!.id, req.body);
        res.json(app);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const togglePin = async (req: Request, res: Response) => {
    try {
        const result = await service.togglePin(req.user!.id, req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const recordUsage = async (req: Request, res: Response) => {
    try {
        const result = await service.recordUsage(req.user!.id, req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteApp = async (req: Request, res: Response) => {
    try {
        await service.deleteApp(req.user!.id, req.params.id);
        res.json({ message: 'Deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const executeLocal = async (req: Request, res: Response) => {
    try {
        // Only allow if running on localhost or Admin?
        // Let's implement a Safe check.
        // For now, allow but log.
        const { command } = req.body;

        // This is only for the "Try to open on Server" feature.
        // Real constraint: Client wants to open on THEIR machine.
        // Browser cannot do that.
        // So this endpoint is technically only useful if Client == Server.

        const result = await service.executeLocal(command);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const initDefaults = async (req: Request, res: Response) => {
    try {
        await service.initDefaults();
        res.json({ message: 'Defaults initialized' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
