import express from 'express';
import { getRates, updateRate, getOverrides, upsertOverride, calculatePerformance } from './creative-performance.controller';
import { protect, authorize } from '../auth/middleware';
import { ROLES } from '../auth/roles';

const router = express.Router();

router.use(protect); // All routes protected

// Only Admins, Developer Admins, and Managers can access these
router.use(authorize(ROLES.DEVELOPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER));

router.route('/rates')
    .get(getRates)
    .post(updateRate);

router.route('/overrides')
    .get(getOverrides)
    .post(upsertOverride);

router.post('/calculate', calculatePerformance);

export default router;
