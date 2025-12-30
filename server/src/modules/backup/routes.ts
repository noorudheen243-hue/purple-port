import express from 'express';
import { downloadBackup } from './controller';

const router = express.Router();

// GET /api/backup/download?secret=XYZ
router.get('/download', downloadBackup);

export default router;
