import { Request, Response } from 'express';
import prisma from '../../utils/prisma';

export const getShiftPresets = async (req: Request, res: Response) => {
    try {
        const presets = await prisma.shiftPreset.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(presets);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createShiftPreset = async (req: Request, res: Response) => {
    try {
        const { name, start_time, end_time } = req.body;

        // Simple Validation
        if (!name || !start_time || !end_time) {
            return res.status(400).json({ error: "Name, Start Time, and End Time are required." });
        }

        // Validate format HH:mm
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
            return res.status(400).json({ error: "Invalid time format. Use HH:mm (24-hour)." });
        }

        const preset = await prisma.shiftPreset.create({
            data: { name, start_time, end_time }
        });
        res.json(preset);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteShiftPreset = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.shiftPreset.delete({ where: { id } });
        res.json({ message: "Shift Preset deleted successfully." });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
