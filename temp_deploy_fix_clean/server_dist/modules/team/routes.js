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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../../modules/auth/middleware");
const roles_1 = require("../../modules/auth/roles");
const teamController = __importStar(require("./controller"));
const router = (0, express_1.Router)();
// Staff Profiles
// Staff Management
router.post('/staff/onboard', middleware_1.protect, (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN), teamController.onboardStaff);
router.get('/staff', middleware_1.protect, teamController.listStaff);
router.get('/staff/next-id', middleware_1.protect, (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN, roles_1.ROLES.MANAGER), teamController.getNextStaffId); // New Route
router.get('/staff/me', middleware_1.protect, teamController.getMyProfile);
router.get('/staff/:id', middleware_1.protect, teamController.getStaffById);
router.post('/staff', middleware_1.protect, (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN), teamController.createStaffProfile);
// removed duplicate onboard call
router.patch('/staff/:id', middleware_1.protect, (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN), teamController.updateStaffFull);
router.delete('/staff/:id', middleware_1.protect, (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN), teamController.deleteStaff);
// Exit Management
router.post('/staff/:id/exit', middleware_1.protect, (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN), teamController.initiateExit);
// KPI
router.get('/kpi', middleware_1.protect, teamController.getKPIs); // Logic handles RBAC
// Attendance
router.post('/attendance', middleware_1.protect, teamController.recordAttendance); // Self or Admin
// Leave
router.get('/leaves', middleware_1.protect, teamController.getLeaves);
router.get('/leave/summary', middleware_1.protect, teamController.getLeaveSummary);
router.post('/leaves', middleware_1.protect, teamController.applyLeave);
router.patch('/leaves/:id/approve', middleware_1.protect, (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), teamController.approveLeave);
exports.default = router;
