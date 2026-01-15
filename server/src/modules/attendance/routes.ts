import express from 'express';
import { AttendanceController } from './controller';
import { LeavePlannerController } from './leave-planner.controller';
import { protect as authenticate, authorize } from '../../modules/auth/middleware';

const router = express.Router();

router.post('/check-in', authenticate, AttendanceController.checkIn);
router.post('/check-out', authenticate, AttendanceController.checkOut);
router.get('/summary', authenticate, AttendanceController.getSummary);
router.post('/regularisation/request', authenticate, AttendanceController.requestRegularisation);
router.get('/team-summary', authenticate, AttendanceController.getTeamSummary);
router.get('/calendar', authenticate, AttendanceController.getMonthlyCalendar);
router.post('/admin/update', authenticate, AttendanceController.adminUpdateAttendance);

router.get('/regularisation/requests', authenticate, AttendanceController.getRegularisationRequests);
router.patch('/regularisation/:id/status', authenticate, AttendanceController.updateRegularisationStatus);
// Biometric Sync
router.post('/biometric-sync', AttendanceController.syncBiometricData); // External Push
router.post('/sync-device', authenticate, AttendanceController.triggerDeviceSync); // Manual Trigger
router.get('/biometric-logs', authenticate, AttendanceController.getBiometricLogs);
// Biometric Console Endpoints
router.get('/biometric/info', authenticate, AttendanceController.getDeviceInfo);
router.get('/biometric/users', authenticate, AttendanceController.getDeviceUsers);
router.post('/biometric/restart', authenticate, AttendanceController.restartDevice);
router.post('/biometric/sync-time', authenticate, AttendanceController.syncTime);
router.post('/biometric/clear-logs', authenticate, AttendanceController.clearLogs);
router.post('/biometric/users/add', authenticate, AttendanceController.addDeviceUser);

// User Data Sync
router.post('/biometric/users/upload', authenticate, AttendanceController.uploadUsersToDevice);
router.post('/biometric/users/import', authenticate, AttendanceController.importUsersFromDevice);
router.get('/biometric/audit', authenticate, AttendanceController.getSyncAudit);
router.put('/biometric/users/edit', authenticate, AttendanceController.editDeviceUser);
router.delete('/biometric/users/:staffNumber', authenticate, AttendanceController.deleteDeviceUser);

router.post('/biometric/enroll', authenticate, AttendanceController.startEnrollment);
router.post('/biometric/sync-templates', authenticate, AttendanceController.syncTemplates);


// Leave Planner & Holidays
router.get('/planner/holidays', authenticate, LeavePlannerController.getHolidays);
router.post('/planner/holidays', authenticate, LeavePlannerController.addHoliday);
router.delete('/planner/holidays/:id', authenticate, LeavePlannerController.deleteHoliday);
router.post('/planner/holidays/sundays', authenticate, LeavePlannerController.populateSundays);

router.get('/planner/allocations', authenticate, LeavePlannerController.getAllocations);
router.post('/planner/allocations', authenticate, LeavePlannerController.updateAllocation);

export default router;
