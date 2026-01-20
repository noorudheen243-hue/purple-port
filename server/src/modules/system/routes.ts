import { Router } from 'express';
import { protect, authorize } from '../auth/middleware';
import * as controller from './controller';

const router = Router();

router.use(protect);

// Only Developer Admin can trigger cloud sync
router.post('/deploy', authorize('DEVELOPER_ADMIN', 'ADMIN'), controller.syncToCloud);

export default router;
