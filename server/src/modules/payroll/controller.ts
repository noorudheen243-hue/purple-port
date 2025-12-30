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

export const getPayrollHistory = async (req: Request, res: Response) => {
    try {
        // TODO: Implement list of past runs
        res.json([]);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

