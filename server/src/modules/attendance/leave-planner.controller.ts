
import { Request, Response } from 'express';
import { LeavePlannerService } from './leave-planner.service';

export class LeavePlannerController {

    // Holidays
    static async getHolidays(req: Request, res: Response) {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const data = await LeavePlannerService.getHolidays(year);
            res.json(data);
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    }

    static async addHoliday(req: Request, res: Response) {
        try {
            const { name, date, description } = req.body;
            const item = await LeavePlannerService.addHoliday({ name, date, description });
            res.json(item);
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    }

    static async deleteHoliday(req: Request, res: Response) {
        try {
            await LeavePlannerService.deleteHoliday(req.params.id);
            res.json({ success: true });
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    }

    static async populateSundays(req: Request, res: Response) {
        try {
            const year = parseInt(req.body.year) || new Date().getFullYear();
            const result = await LeavePlannerService.populateSundays(year);
            res.json(result);
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    }

    // Allocations
    static async getAllocations(req: Request, res: Response) {
        // getAllocations
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const userId = req.query.userId as string;
            const data = await LeavePlannerService.getLeaveAllocations(year, userId);
            res.json(data);
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    }

    static async updateAllocation(req: Request, res: Response) {
        try {
            const { user_id, year, casual, sick, earned, unpaid } = req.body;
            const result = await LeavePlannerService.updateAllocation({
                user_id,
                year: parseInt(year),
                casual: parseFloat(casual),
                sick: parseFloat(sick),
                earned: parseFloat(earned),
                unpaid: parseFloat(unpaid)
            });
            res.json(result);
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    }
}
