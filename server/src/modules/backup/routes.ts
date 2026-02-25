import express from 'express';
import multer from 'multer';
import {
    exportFullBackupZip,
    importFullBackupZip,
    saveBackupToDisk,
    listLocalBackups,
    restoreFromDisk,
    getAutoBackupSetting,
    setAutoBackupSetting
} from './controller';
import { protect, authorize } from '../../modules/auth/middleware';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

// ─── New Disk-Based Backup Endpoints (Admin + Dev Admin) ────────────────────
router.post('/save-to-disk', protect, authorize('ADMIN', 'DEVELOPER_ADMIN'), saveBackupToDisk);
router.get('/list-local', protect, authorize('ADMIN', 'DEVELOPER_ADMIN'), listLocalBackups);
router.post('/restore-from-disk', protect, authorize('ADMIN', 'DEVELOPER_ADMIN'), restoreFromDisk);

// ─── Auto-Backup Setting ─────────────────────────────────────────────────────
router.get('/auto-backup-setting', protect, authorize('ADMIN', 'DEVELOPER_ADMIN'), getAutoBackupSetting);
router.post('/auto-backup-setting', protect, authorize('ADMIN', 'DEVELOPER_ADMIN'), setAutoBackupSetting);

// ─── Legacy Endpoints (kept for backward-compat with Data Sync tab) ──────────
// GET /api/backup/export-json  → browser file download
router.get('/export-json', protect, authorize('ADMIN'), exportFullBackupZip);
// POST /api/backup/import-json → file upload restore
router.post('/import-json', protect, authorize('ADMIN'), upload.single('file'), importFullBackupZip);

export default router;
