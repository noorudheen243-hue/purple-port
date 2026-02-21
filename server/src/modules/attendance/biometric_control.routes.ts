import { Router } from 'express';
import { BiometricController } from './biometric.controller';
import { protect as authenticate, authorize } from '../../modules/auth/middleware';

const router = Router();

// Base Path: /api/attendance/biometric (To be mounted in app.ts)

// Info
router.get('/info', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.getDeviceInfo);
router.get('/status', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.getDeviceStatus);
router.get('/audit', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.auditUserSync);
router.get('/sync-history', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.getSyncHistory);

// Users
router.get('/users', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.getDeviceUsers);

// Actions
router.post('/restart', authenticate, authorize('ADMIN', 'DEVELOPER_ADMIN'), BiometricController.restartDevice);
router.post('/sync-time', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.syncTime);
router.post('/sync-all', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), BiometricController.syncAllLogs);
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

// One-time cleanup: deactivate orphaned StaffShiftAssignments (shift was deleted but assignment still exists)
router.post('/bridge/clean-orphans', requireApiKey, async (req: any, res: any) => {
    try {
        const prisma = require('../../utils/prisma').default;
        // Find all active assignments and check if their shift still exists
        const all = await prisma.staffShiftAssignment.findMany({
            where: { is_active: true },
            select: { id: true, shift_id: true }
        });
        const orphaned: string[] = [];
        for (const a of all) {
            const shift = await prisma.shift.findUnique({ where: { id: a.shift_id }, select: { id: true } });
            if (!shift) orphaned.push(a.id);
        }
        if (orphaned.length > 0) {
            await prisma.staffShiftAssignment.updateMany({
                where: { id: { in: orphaned } },
                data: { is_active: false }
            });
        }
        res.json({ message: `Cleaned ${orphaned.length} orphaned shift assignment(s).`, cleaned: orphaned.length });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
