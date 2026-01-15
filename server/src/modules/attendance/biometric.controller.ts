import { Request, Response } from 'express';
import { biometricControl } from './biometric.service';

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

    // Sync Logs (Pull from Device -> DB)
    static async syncLogs(req: Request, res: Response) {
        try {
            // Dynamically import to resolve circular dependency if any, or just use exported function
            const { syncBiometrics } = require('./biometric.service');
            const result = await syncBiometrics();
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
