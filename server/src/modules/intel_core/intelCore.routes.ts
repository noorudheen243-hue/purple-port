import { Router } from 'express';
import { IntelCoreController } from './intelCore.controller';
import { protect, authorize } from '../auth/middleware';
import { ROLES } from '../auth/roles';

const router = Router();

// All Intelligence routes require Developer Admin or Admin access
router.use(protect);
router.use(authorize(ROLES.DEVELOPER_ADMIN, ROLES.ADMIN));

router.get('/stream', IntelCoreController.getIntelligenceStream);
router.post('/action/approve', IntelCoreController.approveAction);
router.post('/action/ignore', IntelCoreController.ignoreAction);
router.post('/thought/trigger', IntelCoreController.triggerThought);

export default router;
