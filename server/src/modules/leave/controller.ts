import { Request, Response } from 'express';
import { LeaveService } from './service';

export class LeaveController {

    static async applyLeave(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const { type, start_date, end_date, reason } = req.body;
            const leave = await LeaveService.applyLeave(userId, type, new Date(start_date), new Date(end_date), reason);

            res.status(201).json(leave);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async getMyLeaves(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const leaves = await LeaveService.getLeaveRequests(userId);
            res.status(200).json(leaves);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Admin/Manager Action
    static async getAllRequests(req: Request, res: Response) {
        try {
            // Check role?
            const leaves = await LeaveService.getLeaveRequests(undefined, 'PENDING');
            res.status(200).json(leaves);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateStatus(req: Request, res: Response) {
        try {
            const approverId = req.user?.id;
            if (!approverId) return res.status(401).json({ message: 'Unauthorized' });

            const { id } = req.params;
            const { status, rejection_reason } = req.body;

            if (!['APPROVED', 'REJECTED'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }

            const updated = await LeaveService.updateLeaveStatus(id, approverId, status, rejection_reason);
            res.status(200).json(updated);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }
    static async getHistory(req: Request, res: Response) {
        try {
            const { month, year, status } = req.query;
            const history = await LeaveService.getLeaveHistory(
                parseInt(month as string),
                parseInt(year as string),
                status as string
            );
            res.status(200).json(history);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async revertLeave(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updated = await LeaveService.revertLeaveStatus(id);
            res.status(200).json(updated);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async deleteLeave(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await LeaveService.deleteLeaveRequest(id);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }
}
