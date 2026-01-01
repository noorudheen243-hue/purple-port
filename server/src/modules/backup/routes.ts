import express from 'express';
import multer from 'multer';
import { downloadBackup, exportFullBackupZip, importFullBackupZip } from './controller';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

import { protect, authorize } from '../../modules/auth/middleware';

// GET /api/backup/download?secret=XYZ (Legacy/External)
router.get('/download', downloadBackup);

// JSON Sync Endpoints (Admin Only)
router.get('/export-json', protect, authorize('ADMIN'), exportFullBackupZip);
router.post('/import-json', protect, authorize('ADMIN'), upload.single('file'), importFullBackupZip);

export default router;
