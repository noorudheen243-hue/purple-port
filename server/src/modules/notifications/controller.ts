import { Request, Response } from 'express';
import * as notificationService from './service';

export const getMyNotifications = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('Unauthorized');
        const notifications = await notificationService.getUserNotifications(req.user.id);
        res.json(notifications);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('Unauthorized');
        await notificationService.markNotificationAsRead(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAllRead = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('Unauthorized');
        await notificationService.markAllAsRead(req.user.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
