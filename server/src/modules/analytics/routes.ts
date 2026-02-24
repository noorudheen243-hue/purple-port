import express from 'express';
import { getDashboardStats, getTeamPerformanceStats, getAttendanceStats, getCreativeMetrics, getCreativeDashboardStats } from './controller';
import { protect, authorize } from '../auth/middleware';

const router = express.Router();

router.use(protect);

router.get('/dashboard', authorize('ADMIN', 'MANAGER', 'MARKETING_EXEC'), getDashboardStats);
router.get('/team-performance', authorize('ADMIN', 'MANAGER'), getTeamPerformanceStats);
router.get('/attendance', authorize('ADMIN', 'MANAGER'), getAttendanceStats);
router.get('/creative-metrics', authorize('ADMIN', 'MANAGER'), getCreativeMetrics);
router.get('/creative-dashboard', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), getCreativeDashboardStats);

export default router;
