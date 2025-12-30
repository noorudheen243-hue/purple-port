import express from 'express';
import { getDashboardStats, getTeamPerformanceStats, getAttendanceStats, getCreativeMetrics } from './controller';
import { protect, authorize } from '../auth/middleware';

const router = express.Router();

router.use(protect);

router.get('/dashboard', authorize('ADMIN', 'MANAGER', 'MARKETING_EXEC'), getDashboardStats);
router.get('/team-performance', authorize('ADMIN', 'MANAGER'), getTeamPerformanceStats);
router.get('/attendance', authorize('ADMIN', 'MANAGER'), getAttendanceStats);
router.get('/creative-metrics', authorize('ADMIN', 'MANAGER'), getCreativeMetrics);

export default router;
