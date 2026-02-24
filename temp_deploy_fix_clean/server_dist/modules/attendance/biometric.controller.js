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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiometricController = void 0;
const biometric_service_1 = require("./biometric.service");
const prisma_1 = __importDefault(require("../../utils/prisma"));
class BiometricController {
    // Get Device Info (Status, Serial, Capacities)
    static getDeviceInfo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const info = yield biometric_service_1.biometricControl.getDeviceInfo();
                res.json(info);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    // Get Users from Device
    static getDeviceUsers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield biometric_service_1.biometricControl.getDeviceUsers();
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    // Restart Device
    static restartDevice(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield biometric_service_1.biometricControl.restartDevice();
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    // Sync Time
    static syncTime(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield biometric_service_1.biometricControl.syncDeviceTime();
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    // Clear Logs
    static clearLogs(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield biometric_service_1.biometricControl.clearAttendanceLogs();
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    // Unified Sync All Logs (Replaces syncLogs)
    static syncAllLogs(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { syncBiometrics } = require('./biometric.service');
                const result = yield syncBiometrics('MANUAL');
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    // Get Device Status from Persistent DB Table (Heartbeat Results)
    static getDeviceStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const status = yield prisma_1.default.biometricDeviceStatus.findUnique({
                    where: { id: 'CURRENT' }
                });
                res.json(status);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    // Get Sync History
    static getSyncHistory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const history = yield prisma_1.default.biometricSyncLog.findMany({
                    orderBy: { sync_time: 'desc' },
                    take: 50
                });
                res.json(history);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    // Audit User Sync
    static auditUserSync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield biometric_service_1.biometricControl.auditUserSync();
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    // Add User to Device
    static addUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Expecting body: { uid, userId, name, role, cardno, password }
                const result = yield biometric_service_1.biometricControl.setUserOnDevice(req.body);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    // Delete User from Device
    static deleteUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.body;
                if (!userId)
                    throw new Error('User ID is required');
                const result = yield biometric_service_1.biometricControl.deleteUserFromDevice(String(userId));
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    // Upload Logs (Push from Remote Bridge -> DB)
    static uploadLogs(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Body: { logs: [], deviceId: string }
                const { logs } = req.body;
                if (!Array.isArray(logs))
                    throw new Error('Invalid logs format. Expected array.');
                // Re-use the processing logic
                const { processBiometricLogs } = require('./biometric.service');
                const result = yield processBiometricLogs(logs);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
}
exports.BiometricController = BiometricController;
