import { Request, Response } from 'express';
import * as analyticsService from './service';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const stats = await analyticsService.getManagerStats();
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTeamPerformanceStats = async (req: Request, res: Response) => {
    try {
        const { department, startDate, endDate } = req.query;

        let start: Date | undefined;
        let end: Date | undefined;

        if (startDate) start = new Date(startDate as string);
        if (endDate) end = new Date(endDate as string);

        const stats = await analyticsService.getTeamPerformanceStats(
            department as string,
            start,
            end
        );
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAttendanceStats = async (req: Request, res: Response) => {
    try {
        const stats = await analyticsService.getAttendanceStats();
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCreativeMetrics = async (req: Request, res: Response) => {
    try {
        const stats = await analyticsService.getCreativeTeamMetrics();
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCreativeDashboardStats = async (req: Request, res: Response) => {
    try {
        const stats = await analyticsService.getCreativeDashboardStats();
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
