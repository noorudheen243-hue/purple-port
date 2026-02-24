"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const biometric_controller_1 = require("./biometric.controller");
const middleware_1 = require("../../modules/auth/middleware");
const router = (0, express_1.Router)();
// Base Path: /api/attendance/biometric (To be mounted in app.ts)
// Info
router.get('/info', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.getDeviceInfo);
router.get('/status', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.getDeviceStatus);
router.get('/audit', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.auditUserSync);
router.get('/sync-history', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.getSyncHistory);
// Users
router.get('/users', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.getDeviceUsers);
// Actions
router.post('/restart', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.restartDevice);
router.post('/sync-time', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.syncTime);
router.post('/sync-all', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.syncAllLogs);
router.post('/upload-logs', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.uploadLogs);
router.post('/clear-logs', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.clearLogs);
// User Management
router.post('/users/add', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.addUser);
router.post('/users/delete', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), biometric_controller_1.BiometricController.deleteUser);
// dedicated API Key Middleware for Bridge
const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const envKey = process.env.BIOMETRIC_API_KEY || 'ag_bio_sync_v1_secret_key';
    if (apiKey && apiKey === envKey) {
        next();
    }
    else {
        res.status(403).json({ message: 'Forbidden: Invalid Bridge API Key' });
    }
};
// Bridge Agent Routes (API Key Protected)
router.post('/bridge/upload', requireApiKey, biometric_controller_1.BiometricController.uploadLogs);
// One-time cleanup: deactivate orphaned StaffShiftAssignments (shift was deleted but assignment still exists)
router.post('/bridge/clean-orphans', requireApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const prisma = require('../../utils/prisma').default;
        // Find all active assignments and check if their shift still exists
        const all = yield prisma.staffShiftAssignment.findMany({
            where: { is_active: true },
            select: { id: true, shift_id: true }
        });
        const orphaned = [];
        for (const a of all) {
            const shift = yield prisma.shift.findUnique({ where: { id: a.shift_id }, select: { id: true } });
            if (!shift)
                orphaned.push(a.id);
        }
        if (orphaned.length > 0) {
            yield prisma.staffShiftAssignment.updateMany({
                where: { id: { in: orphaned } },
                data: { is_active: false }
            });
        }
        res.json({ message: `Cleaned ${orphaned.length} orphaned shift assignment(s).`, cleaned: orphaned.length });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
