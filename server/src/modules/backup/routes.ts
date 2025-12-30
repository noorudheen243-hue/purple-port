import express from 'express';
import multer from 'multer';
import { downloadBackup, exportFullBackupZip, importFullBackupZip } from './controller';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

// GET /api/backup/download?secret=XYZ
router.get('/download', downloadBackup);

// JSON Sync Endpoints
router.get('/export-json', exportFullBackupZip);
router.post('/import-json', upload.single('file'), importFullBackupZip);

export default router;
