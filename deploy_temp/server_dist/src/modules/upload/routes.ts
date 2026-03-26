import express from 'express';
import { upload } from '../../utils/upload';
import { uploadFile } from './controller';
import { protect } from '../auth/middleware'; // Optional protect

const router = express.Router();

// POST /api/upload
router.post('/', protect, upload.single('file'), uploadFile);

export default router;
