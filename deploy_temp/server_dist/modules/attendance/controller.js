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
exports.AttendanceController = void 0;
const service_1 = require("./service");
class AttendanceController {
    static checkIn(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Assuming auth middleware populates this
                if (!userId)
                    return res.status(401).json({ message: 'Unauthorized' });
                const record = yield service_1.AttendanceService.checkIn(userId);
                res.status(200).json(record);
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static checkOut(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId)
                    return res.status(401).json({ message: 'Unauthorized' });
                const record = yield service_1.AttendanceService.checkOut(userId);
                res.status(200).json(record);
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static getSummary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                let userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId)
                    return res.status(401).json({ message: 'Unauthorized' });
                // Allow Admin/Manager to view others
                if ((((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'ADMIN' || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'MANAGER' || ((_d = req.user) === null || _d === void 0 ? void 0 : _d.role) === 'DEVELOPER_ADMIN') && req.query.userId) {
                    userId = req.query.userId;
                }
                const { start, end } = req.query;
                const startDate = start ? new Date(start) : new Date();
                const endDate = end ? new Date(end) : new Date();
                const data = yield service_1.AttendanceService.getAttendance(userId, startDate, endDate);
                res.status(200).json(data);
            }
            catch (error) {
                console.error('Error in getSummary:', error);
                res.status(500).json({ message: error.message });
            }
        });
    }
    static requestRegularisation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId)
                    return res.status(401).json({ message: 'Unauthorized' });
                const { date, type, reason } = req.body;
                const request = yield service_1.AttendanceService.requestRegularisation(userId, new Date(date), type, reason);
                res.status(201).json(request);
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static getTeamSummary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Role check is done in middleware usually, but good to be safe
                // if (req.user?.role !== 'ADMIN') ...
                const { month, year } = req.query;
                // Calculate start and end of month
                const y = parseInt(year) || new Date().getFullYear();
                const m = parseInt(month) || new Date().getMonth() + 1; // 1-12 convention from frontend usually
                const start = new Date(y, m - 1, 1);
                const end = new Date(y, m, 0); // Last day of month
                const data = yield service_1.AttendanceService.getTeamAttendance(start, end, req.user);
                res.status(200).json(data);
            }
            catch (error) {
                console.error('Error in getTeamSummary:', error);
                res.status(500).json({ message: error.message });
            }
        });
    }
    static getRegularisationRequests(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // If admin, fetch all? Or allow filtering.
                // For now, let's allow fetching pending by default or all.
                const { status, userId } = req.query;
                const requests = yield service_1.AttendanceService.getRegularisationRequests(userId, status);
                res.status(200).json(requests);
            }
            catch (error) {
                console.error('Error in getRegularisationRequests:', error);
                res.status(500).json({ message: error.message });
            }
        });
    }
    static updateRegularisationStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const { status } = req.body; // APPROVED or REJECTED
                const approverId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!approverId)
                    return res.status(401).json({ message: 'Unauthorized' });
                const result = yield service_1.AttendanceService.updateRegularisationStatus(id, approverId, status);
                res.status(200).json(result);
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static updateRegularisationRequest(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const { id } = req.params;
                const { date, type, reason } = req.body;
                // Admin only or owner? Assuming Admin for "Approvals" page edits
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const result = yield service_1.AttendanceService.updateRegularisationRequest(id, {
                    date: date ? new Date(date) : undefined,
                    type,
                    reason
                });
                res.status(200).json(result);
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static deleteRegularisationRequest(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const { id } = req.params;
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                yield service_1.AttendanceService.deleteRegularisationRequest(id);
                res.status(204).send();
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static getRegularisationHistory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year, status } = req.query;
                const history = yield service_1.AttendanceService.getRegularisationHistory(parseInt(month), parseInt(year), status);
                res.status(200).json(history);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static revertRegularisationStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const { id } = req.params;
                // Admin/Manager only
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const updated = yield service_1.AttendanceService.revertRegularisationStatus(id);
                res.status(200).json(updated);
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static getMonthlyCalendar(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const { month, year } = req.query;
                let userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Admin override
                if ((((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'ADMIN' || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'MANAGER' || ((_d = req.user) === null || _d === void 0 ? void 0 : _d.role) === 'DEVELOPER_ADMIN') && req.query.userId) {
                    userId = req.query.userId;
                }
                if (!userId)
                    return res.status(401).json({ message: 'Unauthorized' });
                const m = parseInt(month) || new Date().getMonth() + 1;
                const y = parseInt(year) || new Date().getFullYear();
                const data = yield service_1.AttendanceService.getMonthlyCalendar(userId, m, y);
                res.status(200).json(data);
            }
            catch (error) {
                console.error('Error in getMonthlyCalendar:', error);
                res.status(500).json({ message: error.message });
            }
        });
    }
    static adminUpdateAttendance(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                // Strictly Admin/Manager
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { userId, date, status, check_in, check_out } = req.body;
                const result = yield service_1.AttendanceService.adminUpdateAttendance(userId, date, { status, check_in, check_out });
                res.status(200).json(result);
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static syncBiometricData(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Admin or API Key check
                let authorized = false;
                if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'DEVELOPER_ADMIN')) {
                    authorized = true;
                }
                else {
                    const apiKey = req.headers['x-api-key'];
                    const envKey = process.env.BIOMETRIC_API_KEY;
                    if (apiKey && envKey && apiKey === envKey) {
                        authorized = true;
                    }
                }
                if (!authorized) {
                    return res.status(403).json({ message: 'Forbidden: Invalid Auth or API Key' });
                }
                const { logs } = req.body; // Expecting { logs: [{ staff_number, timestamp }] }
                if (!Array.isArray(logs))
                    return res.status(400).json({ message: "Invalid format. 'logs' must be an array." });
                const result = yield service_1.AttendanceService.processBiometricLogs(logs);
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Manual Trigger for Device Sync (from UI)
    static triggerDeviceSync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                // Strictly Admin/Manager
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                // Lazy Import to avoid circular deps if any, though service should be fine
                const { syncBiometrics } = require('./biometric.service');
                yield syncBiometrics();
                res.status(200).json({ message: 'Biometric Sync Completed Successfully' });
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static getBiometricLogs(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { start, end } = req.query;
                let userId = req.query.userId; // Optional filter from Admin
                // Access Control
                const currentUser = req.user;
                if (!currentUser)
                    return res.status(401).json({ message: 'Unauthorized' });
                const isAdminOrManager = ['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'].includes(currentUser.role);
                // If NOT admin, force view only OWN logs
                if (!isAdminOrManager) {
                    userId = currentUser.id;
                }
                // If Admin AND no specific user requested, fetch all (userId remains undefined)
                const startDate = start ? new Date(start) : new Date();
                const endDate = end ? new Date(end) : new Date();
                // Default to today if only start provided or invalid
                if (isNaN(startDate.getTime())) {
                    const today = new Date();
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setHours(23, 59, 59, 999);
                }
                const logs = yield service_1.AttendanceService.getBiometricLogs(startDate, endDate, userId);
                res.status(200).json(logs);
            }
            catch (error) {
                console.error('Error in getBiometricLogs:', error);
                res.status(500).json({ message: error.message });
            }
        });
    }
    static uploadUsersToDevice(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                // Strictly Admin/Manager
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { biometricControl } = require('./biometric.service');
                const result = yield biometricControl.uploadUsersToDevice();
                res.status(200).json(result);
            }
            catch (error) {
                console.error('Error in uploadUsersToDevice:', error);
                res.status(500).json({ message: error.message });
            }
        });
    }
    static importUsersFromDevice(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                // Strictly Admin/Manager
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { biometricControl } = require('./biometric.service');
                const result = yield biometricControl.importUsersFromDevice();
                res.status(200).json(result);
            }
            catch (error) {
                console.error('Error in importUsersFromDevice:', error);
                res.status(500).json({ message: error.message });
            }
        });
    }
    static editDeviceUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { staffNumber, name, role } = req.body;
                if (!staffNumber || !name)
                    return res.status(400).json({ message: 'Staff Number and Name are required' });
                const { biometricControl } = require('./biometric.service');
                const result = yield biometricControl.setUserOnDevice(staffNumber, name, role); // role: 14=Admin, 0=User
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static deleteDeviceUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { staffNumber } = req.params;
                if (!staffNumber)
                    return res.status(400).json({ message: 'Staff Number is required' });
                const { biometricControl } = require('./biometric.service');
                const result = yield biometricControl.deleteUserFromDevice(staffNumber);
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // --- Missing Endpoints for Console ---
    static getDeviceInfo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                // Strictly Admin/Manager
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { biometricControl } = require('./biometric.service');
                const result = yield biometricControl.getDeviceInfo();
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static getDeviceUsers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { biometricControl } = require('./biometric.service');
                const result = yield biometricControl.getDeviceUsers();
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static restartDevice(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { biometricControl } = require('./biometric.service');
                const result = yield biometricControl.restartDevice();
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static syncTime(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { biometricControl } = require('./biometric.service');
                const result = yield biometricControl.syncDeviceTime();
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static clearLogs(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { biometricControl } = require('./biometric.service');
                const result = yield biometricControl.clearAttendanceLogs();
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Manual ADD User (for console)
    static addDeviceUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { uid, name, userId, role } = req.body; // uid numeric, userId string
                const { biometricControl } = require('./biometric.service');
                // We reuse setUserOnDevice, but it expects staff number. 
                // If manual add, we might be bypassing staff profile. 
                // Let's use the setUser method directly via control service logic or adapt.
                // BiometricService.setUserOnDevice uses regex match on staffNumber to get UID.
                // If we have manual UID, we need a method that accepts UID directly or modify setUserOnDevice.
                // Actually, `setUser` on ZKLib takes (uid, userid, name...).
                // Let's call the raw method helper or update service.
                // For now, let's assume we use the exposed `setUserOnDevice` and require `userId` (StaffNumber) to match digits for UID
                // OR better, create `addDeviceUser` in service?
                // User requested: `addUserMutation.mutate({ uid: parseInt(uid), name, userId: userid });`
                // Let's add a direct method in controller that uses the connection.
                // BUT strict mode says we should use service. 
                // `setUserOnDevice` in service parses UID from StaffNumber.
                // If manual input has separate UID, we need `setUserRaw` or similar.
                // Re-reading service refactor: `setUserOnDevice` does parsing internally.
                // If user provides UID=1 and UserId="QIX001", and we pass "QIX001", it parses "1".
                // If user manually enters "999" and "Guest", it parses 999.
                // So we can use `setUserOnDevice(userId, name, role)`.
                // Ignoring the manually passed `uid` from frontend if we strictly follow regex?
                // Frontend sends: `{ uid: ..., name: ..., userId: ... }`.
                // Let's just use `setUserOnDevice` with the userId.
                const result = yield biometricControl.setUserOnDevice(userId, name, role || 0);
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static getSyncAudit(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const { biometricControl } = require('./biometric.service');
                const result = yield biometricControl.auditUserSync();
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static startEnrollment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { biometricControl } = require('./biometric.service');
                const { staffNumber, fingerIndex } = req.body;
                const result = yield biometricControl.startEnrollment(staffNumber, fingerIndex || 0);
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static syncTemplates(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { biometricControl } = require('./biometric.service');
                const result = yield biometricControl.syncTemplates();
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Bulk recalculate ALL attendance records (fixes historical PRESENT → HALF_DAY for late punchers)
    static bulkRecalculateAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = (yield Promise.resolve().then(() => __importStar(require('../../utils/prisma')))).default;
                // Get all staff
                const allStaff = yield db.staffProfile.findMany({
                    select: { user_id: true, staff_number: true }
                });
                let totalUpdated = 0;
                const errors = [];
                for (const staff of allStaff) {
                    try {
                        // Recalculate last 6 months by default (or use query params)
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setMonth(startDate.getMonth() - 6);
                        const result = yield service_1.AttendanceService.recalculateAttendance(staff.user_id, startDate, endDate);
                        totalUpdated += result.updatedCount || 0;
                    }
                    catch (e) {
                        errors.push(`${staff.staff_number}: ${e.message}`);
                    }
                }
                res.json({
                    message: `Bulk recalculation complete. Updated ${totalUpdated} records.`,
                    totalUpdated,
                    staffProcessed: allStaff.length,
                    errors: errors.length > 0 ? errors : undefined
                });
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
}
exports.AttendanceController = AttendanceController;
