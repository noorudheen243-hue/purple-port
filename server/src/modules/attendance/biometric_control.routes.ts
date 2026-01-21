import { Router } from 'express';
import { BiometricController } from './biometric.controller';
import { protect as authenticate, authorize } from '../../modules/auth/middleware';

const router = Router();

// Base Path: /api/attendance/biometric (To be mounted in app.ts)

// Info
router.get('/info', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.getDeviceInfo);

// Users
router.get('/users', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.getDeviceUsers);

// Actions
router.post('/restart', authenticate, authorize('ADMIN', 'DEVELOPER_ADMIN'), BiometricController.restartDevice);
router.post('/sync-time', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.syncTime);
router.post('/sync-logs', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.syncLogs);
router.post('/upload-logs', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.uploadLogs);
router.post('/clear-logs', authenticate, authorize('ADMIN', 'DEVELOPER_ADMIN'), BiometricController.clearLogs);

// User Management
router.post('/users/add', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.addUser);
router.post('/users/delete', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.deleteUser);

// dedicated API Key Middleware for Bridge
const requireApiKey = (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'];
    const envKey = process.env.BIOMETRIC_API_KEY || 'ag_bio_sync_v1_secret_key';

    if (apiKey && apiKey === envKey) {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Invalid Bridge API Key' });
    }
};

// Bridge Agent Routes (API Key Protected)
router.post('/bridge/upload', requireApiKey, BiometricController.uploadLogs);

export default router;
