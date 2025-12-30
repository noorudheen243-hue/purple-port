import { Router } from 'express';
import { protect, authorize } from '../../modules/auth/middleware';
import * as teamController from './controller';

const router = Router();

// Staff Profiles
// Staff Management
router.post('/staff/onboard', protect, authorize('ADMIN'), teamController.onboardStaff);
router.get('/staff', protect, teamController.listStaff);
router.get('/staff/me', protect, teamController.getMyProfile);
router.get('/staff/:id', protect, teamController.getStaffById);
router.post('/staff', protect, authorize('ADMIN'), teamController.createStaffProfile);
router.post('/staff/onboard', protect, authorize('ADMIN'), teamController.onboardStaff);
router.patch('/staff/:id', protect, authorize('ADMIN'), teamController.updateStaffFull);
router.delete('/staff/:id', protect, authorize('ADMIN'), teamController.deleteStaff);

// Exit Management
router.post('/staff/:id/exit', protect, authorize('ADMIN'), teamController.initiateExit);

// KPI
router.get('/kpi', protect, teamController.getKPIs); // Logic handles RBAC

// Attendance
router.post('/attendance', protect, teamController.recordAttendance);

// Leave
router.get('/leaves', protect, teamController.getLeaves);
router.get('/leave/summary', protect, teamController.getLeaveSummary);
router.post('/leaves', protect, teamController.applyLeave);
router.patch('/leaves/:id/approve', protect, authorize('ADMIN', 'MANAGER'), teamController.approveLeave);

export default router;
