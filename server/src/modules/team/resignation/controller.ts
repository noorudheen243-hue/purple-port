import { Request, Response } from 'express';
import { z } from 'zod';
import * as resignationService from './service';

// Schemas
const applySchema = z.object({
    reason: z.string().min(5, "Reason must be at least 5 characters"),
    requested_relieving_date: z.string().transform(str => new Date(str))
});

const reviseSchema = z.object({
    days: z.number().min(0, "Days cannot be negative"), // 0 allows immediate relieve
    reason: z.string().min(5, "Revision reason is required")
});

const rejectSchema = z.object({
    reason: z.string().min(5, "Rejection reason is required")
});

// Controllers

export const applyResignation = async (req: Request, res: Response) => {
    try {
        const { reason, requested_relieving_date } = applySchema.parse(req.body);
        const result = await resignationService.createResignationRequest(
            req.user!.id,
            reason,
            requested_relieving_date
        );
        res.status(201).json(result);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: error.errors });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
};

export const getMyResignation = async (req: Request, res: Response) => {
    try {
        const result = await resignationService.getMyResignation(req.user!.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const listResignations = async (req: Request, res: Response) => {
    try {
        // Admin/Manager check already done by route middleware usually, but good to be safe
        const result = await resignationService.getAllResignationRequests();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const approveResignation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await resignationService.approveResignation(id, req.user!.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const rejectResignation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = rejectSchema.parse(req.body);
        const result = await resignationService.rejectResignation(id, req.user!.id, reason);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const reviseNoticePeriod = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { days, reason } = reviseSchema.parse(req.body);
        const result = await resignationService.reviseNoticePeriod(id, req.user!.id, days, reason);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const completeResignation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await resignationService.completeResignation(id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
