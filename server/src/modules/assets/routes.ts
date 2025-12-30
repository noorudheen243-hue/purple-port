import express from 'express';
import { uploadAsset, approveAsset, deleteAsset } from './controller';
import { protect, authorize } from '../auth/middleware';
import { upload } from '../../utils/upload';

const router = express.Router();

router.use(protect);

router.post('/', upload.single('file'), uploadAsset);
router.patch('/:id/approve', authorize('ADMIN', 'MANAGER'), approveAsset);
router.delete('/:id', deleteAsset);

export default router;
