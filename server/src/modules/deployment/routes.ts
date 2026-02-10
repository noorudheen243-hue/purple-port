
import express from 'express';
import { protect, authorize } from '../auth/middleware';
import { triggerDeployment } from './controller';
import { ROLES } from '../auth/roles';

const router = express.Router();

// Only DEVELOPER_ADMIN can deploy
router.post('/deploy', protect, authorize(ROLES.DEVELOPER_ADMIN), triggerDeployment);

export default router;
