import { Request, Response } from 'express';
import { biometricControl } from './biometric.service';
import prisma from '../../utils/prisma';

export class BiometricController {

    // Get Device Info (Status, Serial, Capacities)
    static async getDeviceInfo(req: Request, res: Response) {
        try {
            const info = await biometricControl.getDeviceInfo();
            res.json(info);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get Users from Device
    static async getDeviceUsers(req: Request, res: Response) {
        try {
            const result = await biometricControl.getDeviceUsers();
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Restart Device
    static async restartDevice(req: Request, res: Response) {
        try {
            const result = await biometricControl.restartDevice();
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Sync Time
    static async syncTime(req: Request, res: Response) {
        try {
            const result = await biometricControl.syncDeviceTime();
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Clear Logs
    static async clearLogs(req: Request, res: Response) {
        try {
            const result = await biometricControl.clearAttendanceLogs();
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Unified Sync All Logs (Replaces syncLogs)
    static async syncAllLogs(req: Request, res: Response) {
        try {
            const { syncBiometrics } = require('./biometric.service');
            const result = await syncBiometrics('MANUAL');
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get Device Status from Persistent DB Table (Heartbeat Results)
    static async getDeviceStatus(req: Request, res: Response) {
        try {
            const status = await prisma.biometricDeviceStatus.findUnique({
                where: { id: 'CURRENT' }
            });
            res.json(status);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get Sync History
    static async getSyncHistory(req: Request, res: Response) {
        try {
            const history = await prisma.biometricSyncLog.findMany({
                orderBy: { sync_time: 'desc' },
                take: 50
            });
            res.json(history);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Audit User Sync
    static async auditUserSync(req: Request, res: Response) {
        try {
            const result = await biometricControl.auditUserSync();
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Add User to Device
    static async addUser(req: Request, res: Response) {
        try {
            // Expecting body: { uid, userId, name, role, cardno, password }
            const result = await biometricControl.setUserOnDevice(req.body);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Delete User from Device
    static async deleteUser(req: Request, res: Response) {
        try {
            const { userId } = req.body;
            if (!userId) throw new Error('User ID is required');
            const result = await biometricControl.deleteUserFromDevice(String(userId));
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
    // Upload Logs (Push from Remote Bridge -> DB)
    static async uploadLogs(req: Request, res: Response) {
        try {
            // Body: { logs: [], deviceId: string }
            const { logs } = req.body;
            if (!Array.isArray(logs)) throw new Error('Invalid logs format. Expected array.');

            // Re-use the processing logic
            const { processBiometricLogs } = require('./biometric.service');
            const result = await processBiometricLogs(logs);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
