import express from 'express';
import multer from 'multer';
import { downloadBackup, exportDataJson, importDataJson } from './controller';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

// GET /api/backup/download?secret=XYZ
router.get('/download', downloadBackup);

// JSON Sync Endpoints
router.get('/export-json', exportDataJson);
router.post('/import-json', upload.single('file'), importDataJson);

export default router;
