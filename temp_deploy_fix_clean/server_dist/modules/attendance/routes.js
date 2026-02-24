"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const leave_planner_controller_1 = require("./leave-planner.controller");
const ShiftController = __importStar(require("./shift.controller"));
const middleware_1 = require("../../modules/auth/middleware");
const router = express_1.default.Router();
router.post('/check-in', middleware_1.protect, controller_1.AttendanceController.checkIn);
router.post('/check-out', middleware_1.protect, controller_1.AttendanceController.checkOut);
router.get('/summary', middleware_1.protect, controller_1.AttendanceController.getSummary);
router.post('/regularisation/request', middleware_1.protect, controller_1.AttendanceController.requestRegularisation);
router.get('/team-summary', middleware_1.protect, controller_1.AttendanceController.getTeamSummary);
router.get('/calendar', middleware_1.protect, controller_1.AttendanceController.getMonthlyCalendar);
router.post('/admin/update', middleware_1.protect, controller_1.AttendanceController.adminUpdateAttendance);
router.post('/admin/recalculate-all', middleware_1.protect, controller_1.AttendanceController.bulkRecalculateAll);
router.get('/regularisation/requests', middleware_1.protect, controller_1.AttendanceController.getRegularisationRequests);
router.patch('/regularisation/:id/status', middleware_1.protect, controller_1.AttendanceController.updateRegularisationStatus);
router.put('/regularisation/:id', middleware_1.protect, controller_1.AttendanceController.updateRegularisationRequest);
router.delete('/regularisation/:id', middleware_1.protect, controller_1.AttendanceController.deleteRegularisationRequest);
router.get('/regularisation/history', middleware_1.protect, controller_1.AttendanceController.getRegularisationHistory);
router.post('/regularisation/:id/revert', middleware_1.protect, controller_1.AttendanceController.revertRegularisationStatus);
// Biometric Sync
router.post('/biometric-sync', controller_1.AttendanceController.syncBiometricData); // External Push
router.post('/sync-device', middleware_1.protect, controller_1.AttendanceController.triggerDeviceSync); // Manual Trigger
router.get('/biometric-logs', middleware_1.protect, controller_1.AttendanceController.getBiometricLogs);
// Biometric Console Endpoints
router.get('/biometric/info', middleware_1.protect, controller_1.AttendanceController.getDeviceInfo);
router.get('/biometric/users', middleware_1.protect, controller_1.AttendanceController.getDeviceUsers);
router.post('/biometric/restart', middleware_1.protect, controller_1.AttendanceController.restartDevice);
router.post('/biometric/sync-time', middleware_1.protect, controller_1.AttendanceController.syncTime);
router.post('/biometric/clear-logs', middleware_1.protect, controller_1.AttendanceController.clearLogs);
router.post('/biometric/users/add', middleware_1.protect, controller_1.AttendanceController.addDeviceUser);
// User Data Sync
router.post('/biometric/users/upload', middleware_1.protect, controller_1.AttendanceController.uploadUsersToDevice);
router.post('/biometric/users/import', middleware_1.protect, controller_1.AttendanceController.importUsersFromDevice);
router.get('/biometric/audit', middleware_1.protect, controller_1.AttendanceController.getSyncAudit);
router.put('/biometric/users/edit', middleware_1.protect, controller_1.AttendanceController.editDeviceUser);
router.delete('/biometric/users/:staffNumber', middleware_1.protect, controller_1.AttendanceController.deleteDeviceUser);
router.post('/biometric/enroll', middleware_1.protect, controller_1.AttendanceController.startEnrollment);
router.post('/biometric/sync-templates', middleware_1.protect, controller_1.AttendanceController.syncTemplates);
// Leave Planner & Holidays
router.get('/planner/holidays', middleware_1.protect, leave_planner_controller_1.LeavePlannerController.getHolidays);
router.post('/planner/holidays', middleware_1.protect, leave_planner_controller_1.LeavePlannerController.addHoliday);
router.delete('/planner/holidays/:id', middleware_1.protect, leave_planner_controller_1.LeavePlannerController.deleteHoliday);
router.post('/planner/holidays/sundays', middleware_1.protect, leave_planner_controller_1.LeavePlannerController.populateSundays);
router.get('/planner/allocations', middleware_1.protect, leave_planner_controller_1.LeavePlannerController.getAllocations);
router.post('/planner/allocations', middleware_1.protect, leave_planner_controller_1.LeavePlannerController.updateAllocation);
// Shift Configuration
router.get('/shifts', middleware_1.protect, ShiftController.getShifts);
router.post('/shifts', middleware_1.protect, ShiftController.createShift);
router.put('/shifts/:id', middleware_1.protect, ShiftController.updateShift);
router.delete('/shifts/:id', middleware_1.protect, ShiftController.deleteShift);
// Shift Assignments
router.get('/shifts/assignments/:staffId', middleware_1.protect, ShiftController.getStaffAssignments);
router.post('/shifts/assign', middleware_1.protect, ShiftController.assignShift);
router.delete('/shifts/assignments/:id', middleware_1.protect, ShiftController.deleteAssignment);
router.get('/shifts/active', middleware_1.protect, ShiftController.getShiftForDate);
router.post('/shifts/sync-logs', middleware_1.protect, ShiftController.syncShiftLogs);
exports.default = router;
