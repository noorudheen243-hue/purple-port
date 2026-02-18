import { Request, Response } from 'express';
import { ShiftService } from './shift.service';

// --- Attributes ---

export const getShifts = async (req: Request, res: Response) => {
    try {
        const shifts = await ShiftService.listShifts();
        res.json(shifts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createShift = async (req: Request, res: Response) => {
    try {
        const { name, start_time, end_time, default_grace_time } = req.body;

        // Simple Validation
        if (!name || !start_time || !end_time) {
            return res.status(400).json({ error: "Name, Start Time, and End Time are required." });
        }

        // Validate format HH:mm
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
            return res.status(400).json({ error: "Invalid time format. Use HH:mm (24-hour)." });
        }

        const shift = await ShiftService.createShift({
            name,
            start_time,
            end_time,
            default_grace_time: default_grace_time ? parseInt(default_grace_time) : 15
        });
        res.json(shift);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateShift = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, start_time, end_time, default_grace_time } = req.body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (start_time) updateData.start_time = start_time;
        if (end_time) updateData.end_time = end_time;
        if (default_grace_time !== undefined) updateData.default_grace_time = parseInt(default_grace_time);

        const shift = await ShiftService.updateShift(id, updateData);
        res.json(shift);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteShift = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await ShiftService.deleteShift(id);
        res.json({ message: "Shift deleted successfully." });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// --- Assignments ---

export const assignShift = async (req: Request, res: Response) => {
    try {
        const { staff_id, shift_id, from_date, to_date } = req.body;

        if (!staff_id || !shift_id || !from_date) {
            return res.status(400).json({ error: "Staff ID, Shift ID, and From Date are required." });
        }

        const assignment = await ShiftService.assignShift({
            staff_id,
            shift_id,
            from_date: new Date(from_date),
            to_date: to_date ? new Date(to_date) : null
        });

        res.json(assignment);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const getStaffAssignments = async (req: Request, res: Response) => {
    try {
        const { staffId } = req.params;
        const assignments = await ShiftService.getStaffAssignments(staffId);
        res.json(assignments);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteAssignment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await ShiftService.deleteAssignment(id);
        res.json({ message: "Assignment removed." });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getShiftForDate = async (req: Request, res: Response) => {
    try {
        let { staffId, date } = req.query;

        if (!staffId) {
            staffId = req.user?.id;
        }

        if (!staffId || !date) {
            return res.status(400).json({ error: "Staff ID (or Auth) and Date are required." });
        }

        const shift = await ShiftService.getShiftForDate(staffId as string, new Date(date as string));
        res.json(shift);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
