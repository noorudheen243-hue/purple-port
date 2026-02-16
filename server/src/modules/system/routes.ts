import { Router } from 'express';
import { protect, authorize } from '../auth/middleware';
import * as controller from './controller';

const router = Router();

router.use(protect);

// Only Developer Admin can trigger cloud sync
router.post('/deploy', authorize('DEVELOPER_ADMIN', 'ADMIN'), controller.syncToCloud);
router.post('/cleanup-files', authorize('DEVELOPER_ADMIN', 'ADMIN'), controller.cleanupFilesOnly);
router.post('/optimize', controller.optimizeSystem); // Accessible to all logged-in users

export default router;
