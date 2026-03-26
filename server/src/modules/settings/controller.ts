import { Request, Response } from 'express';
import prisma from '../../utils/prisma';

export async function getSettings(req: Request, res: Response) {
    try {
        const settings = await prisma.systemSetting.findMany();
        const settingsMap = settings.reduce((acc: any, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json(settingsMap);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
    }
}

export async function updateSetting(req: Request, res: Response) {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ message: 'Key is required' });

    try {
        const setting = await prisma.systemSetting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) }
        });
        res.json(setting);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to update setting', error: error.message });
    }
}

export async function batchUpdateSettings(req: Request, res: Response) {
    const { settings } = req.body; // Expecting { key: value } object
    if (!settings) return res.status(400).json({ message: 'Settings object is required' });

    try {
        const entries = Object.entries(settings);
        const results = await Promise.all(
            entries.map(([key, value]) =>
                prisma.systemSetting.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value) }
                })
            )
        );
        res.json({ message: 'Settings updated successfully', results });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to update settings', error: error.message });
    }
}
