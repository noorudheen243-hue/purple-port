import { Request, Response } from 'express';
import * as payrollService from './service';

export const listHolidays = async (req: Request, res: Response) => {
    try {
        const holidays = await payrollService.listHolidays();
        res.json(holidays);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createHoliday = async (req: Request, res: Response) => {
    try {
        const { name, date, description } = req.body;
        const holiday = await payrollService.createHoliday({
            name,
            date: new Date(date),
            description
        });
        res.status(201).json(holiday);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteHoliday = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await payrollService.deleteHoliday(id);
        res.json({ message: "Holiday deleted" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- PAYROLL PROCESSING ---

export const getSalaryDraft = async (req: Request, res: Response) => {
    try {
        const { userId, month, year } = req.query;
        if (!userId || !month || !year) {
            return res.status(400).json({ message: "UserId, Month, and Year are required." });
        }

        const draft = await payrollService.getSalaryDraft(
            userId as string,
            parseInt(month as string),
            parseInt(year as string)
        );
        res.json(draft);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const savePayrollSlip = async (req: Request, res: Response) => {
    try {
        const { month, year, userId, data } = req.body;
        if (!userId || !month || !year || !data) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const slip = await payrollService.savePayrollSlip(month, year, { ...data, user_id: userId });
        res.json(slip);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const confirmPayrollRun = async (req: Request, res: Response) => {
    try {
        const { month, year } = req.body;
        if (!month || !year) {
            return res.status(400).json({ message: "Month/Year required." });
        }

        const result = await payrollService.confirmPayrollRun(month, year);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPayrollRun = async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) return res.status(400).json({ message: "Month and Year required" });

        const data = await payrollService.getPayrollRunDetails(parseInt(month as string), parseInt(year as string));
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPayrollHistory = async (req: Request, res: Response) => {
    try {
        const { userId, year, month } = req.query; // Filters

        // RBAC Logic
        // 1. If Admin/Manager, can query any userId (or all if undefined)
        // 2. If Staff, can ONLY query their own userId

        let targetUserId: string | undefined = undefined;

        if (req.user!.role === 'ADMIN' || req.user!.role === 'MANAGER' || req.user!.role === 'DEVELOPER_ADMIN') {
            if (userId && typeof userId === 'string') {
                targetUserId = userId === 'me' ? req.user!.id : userId;
            }
            // If userId undefined, fetched ALL (Admin view all slips? Or maybe we enforce filtering for optimized UX? Service handles optional userId)
        } else {
            // Staff
            if (userId && userId !== 'me' && userId !== req.user!.id) {
                return res.status(403).json({ message: "Forbidden: Cannot view other's slips" });
            }
            targetUserId = req.user!.id;
        }

        const y = year ? parseInt(year as string) : new Date().getFullYear();
        const m = month ? parseInt(month as string) : undefined;

        const slips = await payrollService.getPayrollSlips(targetUserId, y, m);
        res.json(slips);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const processSlip = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const slip = await payrollService.processIndividualSlip(id);
        res.json(slip);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const rejectSlip = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await payrollService.rejectIndividualSlip(id);
        res.json({ message: "Slip rejected" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

