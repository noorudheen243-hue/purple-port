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
exports.syncBiometrics = exports.processBiometricLogs = exports.biometricControl = exports.BiometricDaemon = exports.BiometricControlService = void 0;
// @ts-ignore
const zkteco_js_1 = __importDefault(require("zkteco-js"));
const prisma_1 = __importDefault(require("../../utils/prisma"));
const service_1 = require("./service");
const getErrMsg = (e) => e.message || JSON.stringify(e) || 'Unknown Error';
class AsyncMutex {
    constructor() {
        this.queue = Promise.resolve();
    }
    run(callback) {
        const result = this.queue.then(() => callback());
        this.queue = result.catch(() => { }); // Ensure queue continues even if task fails
        return result;
    }
}
class BiometricControlService {
    constructor() {
        this.connected = false;
        this.mutex = new AsyncMutex(); // Concurrency Control
        this.heartbeatInterval = null;
        // Using standard ZK default credentials/ports
        this.ip = '192.168.1.201';
        this.port = 4370;
        this.timeout = 20000;
        this.inport = 4000;
        // Initialize ZKLib
        this.zk = new zkteco_js_1.default(this.ip, this.port, this.timeout, this.inport);
    }
    connect() {
        return __awaiter(this, arguments, void 0, function* (retries = 2) {
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    // Ensure socket is theoretically clean
                    if (this.zk && this.zk.ztcp && this.zk.ztcp.socket && !this.zk.ztcp.socket.destroyed) {
                        yield this.disconnect();
                    }
                    // FORCE TCP: Skip zk.createSocket() which toggles UDP/TCP
                    // We directly access the ZTCP instance and connect
                    yield this.zk.ztcp.createSocket(); // Must initialize socket first!
                    yield this.zk.ztcp.connect(); // Then send handshake
                    this.zk.connectionType = 'tcp'; // Manually set flag for library to work
                    return true;
                }
                catch (error) {
                    if (attempt === retries) {
                        // console.error(`Biometric Connection Failed after ${retries} attempts.`);
                        return false;
                    }
                    // Faster retry: 1s instead of 2s
                    yield new Promise(r => setTimeout(r, 1000));
                }
            }
            return false;
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.zk.disconnect();
            }
            catch (e) {
                // console.error("Disconnect error:", e);
            }
        });
    }
    // --- Device Info & Status ---
    probeDevice() {
        return __awaiter(this, arguments, void 0, function* (timeout = 200) {
            return new Promise(resolve => {
                const { Socket } = require('net');
                const socket = new Socket();
                socket.setTimeout(timeout);
                socket.on('connect', () => {
                    socket.destroy();
                    resolve(true);
                });
                socket.on('timeout', () => {
                    socket.destroy();
                    resolve(false);
                });
                socket.on('error', (e) => {
                    socket.destroy();
                    resolve(false);
                });
                socket.connect(this.port, this.ip);
            });
        });
    }
    // --- Device Info & Status ---
    getDeviceInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mutex.run(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    // AUTO-DETECT: Try to reach device physically first (Fast Probe)
                    const isReachable = yield this.probeDevice(500);
                    let info;
                    if (isReachable) {
                        // We are likely Local / Offline Hosting
                        if (!(yield this.connect()))
                            throw new Error('Device reachable but refused connection');
                        info = yield this.fetchStartDeviceInfo();
                    }
                    else {
                        // 1. FALLBACK TO SMART CHECK (Bridge Mode / VPS)
                        // If the bridge pushed data in the last 24 hours, assume ONLINE.
                        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                        const recentLog = yield prisma_1.default.attendanceRecord.findFirst({
                            where: {
                                method: 'BIOMETRIC',
                                updatedAt: { gte: yesterday }
                            },
                            orderBy: { updatedAt: 'desc' }
                        });
                        if (recentLog) {
                            const dbUserCount = yield prisma_1.default.staffProfile.count();
                            const dbLogCount = yield prisma_1.default.attendanceRecord.count({ where: { method: 'BIOMETRIC' } });
                            info = {
                                status: 'ONLINE',
                                deviceName: 'Bridge Device (VPS Mode)',
                                serialNumber: 'SYNCED-VIA-BRIDGE',
                                firmware: 'N/A',
                                platform: 'Bridge',
                                deviceTime: new Date(),
                                lastSyncTime: recentLog.updatedAt,
                                userCount: dbUserCount,
                                logCount: dbLogCount
                            };
                        }
                        else {
                            info = {
                                status: 'OFFLINE',
                                error: 'Device unreachable and no recent bridge data.'
                            };
                        }
                    }
                    // Update Status Table
                    yield prisma_1.default.biometricDeviceStatus.upsert({
                        where: { id: 'CURRENT' },
                        create: { id: 'CURRENT', status: info.status, last_heartbeat: new Date(), device_info: JSON.stringify(info) },
                        update: { status: info.status, last_heartbeat: new Date(), device_info: JSON.stringify(info) }
                    }).catch(() => { });
                    return info;
                }
                catch (error) {
                    const errInfo = {
                        status: 'OFFLINE',
                        error: getErrMsg(error)
                    };
                    yield prisma_1.default.biometricDeviceStatus.upsert({
                        where: { id: 'CURRENT' },
                        create: { id: 'CURRENT', status: 'OFFLINE', last_heartbeat: new Date(), device_info: JSON.stringify(errInfo) },
                        update: { status: 'OFFLINE', last_heartbeat: new Date(), device_info: JSON.stringify(errInfo) }
                    }).catch(() => { });
                    return errInfo;
                }
                finally {
                    yield this.disconnect();
                }
            }));
        });
    }
    fetchStartDeviceInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            // Fail-Fast Helper
            const cmd = (p) => __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield p;
                }
                catch (e) {
                    const msg = (e === null || e === void 0 ? void 0 : e.message) || (e === null || e === void 0 ? void 0 : e.toString()) || '';
                    if (msg.includes('TIMEOUT'))
                        throw e;
                    return 'Unknown';
                }
            });
            const deviceName = yield cmd(this.zk.getDeviceName());
            const serialNumber = yield cmd(this.zk.getSerialNumber());
            const firmware = yield cmd(this.zk.getFirmware());
            const platform = yield cmd(this.zk.getPlatform());
            let time = new Date();
            try {
                time = yield this.zk.getTime();
            }
            catch (e) {
                if ((_a = e === null || e === void 0 ? void 0 : e.message) === null || _a === void 0 ? void 0 : _a.includes('TIMEOUT'))
                    throw e;
            }
            // Get counts
            let userCount = 0;
            try {
                const users = yield this.zk.getUsers();
                userCount = ((_b = users === null || users === void 0 ? void 0 : users.data) === null || _b === void 0 ? void 0 : _b.length) || 0;
            }
            catch (e) {
                if ((_c = e === null || e === void 0 ? void 0 : e.message) === null || _c === void 0 ? void 0 : _c.includes('TIMEOUT'))
                    throw e;
            }
            let logCount = 0;
            try {
                const logsResp = yield this.zk.getAttendances();
                const logs = (logsResp === null || logsResp === void 0 ? void 0 : logsResp.data) || [];
                const now = new Date();
                logCount = logs.filter((l) => {
                    const logDate = new Date(l.recordTime || l.record_time);
                    return logDate.getDate() === now.getDate() &&
                        logDate.getMonth() === now.getMonth() &&
                        logDate.getFullYear() === now.getFullYear();
                }).length;
            }
            catch (e) {
                if ((_d = e === null || e === void 0 ? void 0 : e.message) === null || _d === void 0 ? void 0 : _d.includes('TIMEOUT'))
                    throw e;
            }
            return {
                status: 'ONLINE',
                deviceName,
                serialNumber,
                firmware,
                platform,
                deviceTime: time,
                userCount,
                logCount
            };
        });
    }
    getDeviceUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mutex.run(() => __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    // 1. SMART CHECK: Fail-Fast for Bridge Mode
                    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    const recentLog = yield prisma_1.default.attendanceRecord.findFirst({
                        where: {
                            method: 'BIOMETRIC',
                            updatedAt: { gte: yesterday }
                        }
                    });
                    if (recentLog) {
                        // Fetch real staff list from DB to show as "Enrolled Users" in Bridge Mode
                        const dbStaff = yield prisma_1.default.staffProfile.findMany({
                            include: { user: { select: { full_name: true } } }
                        });
                        const mappedUsers = dbStaff.map(s => {
                            var _a;
                            return ({
                                uid: parseInt(s.staff_number.replace(/\D/g, '')) || 0, // Extract number from QIX001
                                userId: s.staff_number,
                                name: ((_a = s.user) === null || _a === void 0 ? void 0 : _a.full_name) || 'Unknown',
                                role: 0,
                                cardno: 0,
                                fingerCount: 0
                            });
                        });
                        return { data: mappedUsers };
                    }
                    // 2. Physical Connect
                    if (!(yield this.connect()))
                        throw new Error('Device offline');
                    const users = yield this.zk.getUsers();
                    // zkteco-js does not support getTemplates, so fingerCount is 0 for now.
                    // users.data structure: { uid, userId, name, password, role, cardno }
                    const usersWithFingerBytes = ((_a = users === null || users === void 0 ? void 0 : users.data) === null || _a === void 0 ? void 0 : _a.map((u) => (Object.assign(Object.assign({}, u), { fingerCount: 0 // Not supported by library
                     })))) || [];
                    return { data: usersWithFingerBytes };
                }
                catch (error) {
                    // If standard connection fails, we just throw/return error. 
                    // We don't need fallback here because if bridge was active we would have caught it above.
                    throw new Error(`Failed to fetch users: ${getErrMsg(error)}`);
                }
                finally {
                    yield this.disconnect();
                }
            }));
        });
    }
    restartDevice() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mutex.run(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!(yield this.connect()))
                        throw new Error('Device offline');
                    yield this.zk.executeCmd(8); // CMD_RESTART = 8
                    return { message: 'Device restarting...' };
                }
                catch (error) {
                    throw new Error(`Restart failed: ${getErrMsg(error)}`);
                }
                finally {
                    yield this.disconnect();
                }
            }));
        });
    }
    syncDeviceTime() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mutex.run(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!(yield this.connect()))
                        throw new Error('Device offline');
                    yield this.zk.setTime(new Date());
                    return { message: 'Device time synchronized with server.' };
                }
                catch (error) {
                    throw new Error(`Time sync failed: ${getErrMsg(error)}`);
                }
                finally {
                    yield this.disconnect();
                }
            }));
        });
    }
    clearAttendanceLogs() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mutex.run(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!(yield this.connect()))
                        throw new Error('Device offline');
                    yield this.zk.clearAttendanceLog();
                    return { message: 'All attendance logs cleared from device.' };
                }
                catch (error) {
                    throw new Error(`Clear logs failed: ${getErrMsg(error)}`);
                }
                finally {
                    yield this.disconnect();
                }
            }));
        });
    }
    // --- User Management ---
    getNumericUid(staffId) {
        const match = staffId.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }
    setUserOnDevice(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mutex.run(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!(yield this.connect()))
                        throw new Error('Device offline');
                    const uid = data.uid || this.getNumericUid(data.userId);
                    if (uid === 0)
                        throw new Error('Invalid User ID format. Must contain numbers.');
                    yield this.zk.setUser(uid, data.userId, data.name, data.password || '', data.role || 0, data.cardno || 0);
                    return { message: `User ${data.userId} added/updated.` };
                }
                catch (error) {
                    throw new Error(`Set user failed: ${getErrMsg(error)}`);
                }
                finally {
                    yield this.disconnect();
                }
            }));
        });
    }
    deleteUserFromDevice(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mutex.run(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!(yield this.connect()))
                        throw new Error('Device offline');
                    const uid = this.getNumericUid(userId);
                    yield this.zk.deleteUser(uid);
                    return { message: `User ${userId} deleted.` };
                }
                catch (error) {
                    throw new Error(`Delete user failed: ${getErrMsg(error)}`);
                }
                finally {
                    yield this.disconnect();
                }
            }));
        });
    }
    startEnrollment(staffNumber, fingerIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Feature Removed: Remote enrollment is disabled.");
        });
    }
    syncTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Template sync not supported by current driver version.");
        });
    }
    // --- High Level Sync & Audit ---
    auditUserSync() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mutex.run(() => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                try {
                    // 1. Get DB Users
                    const dbStaff = yield prisma_1.default.staffProfile.findMany({
                        // where: { isActive: true }, // Removed invalid field
                        include: { user: { select: { full_name: true } } }
                    });
                    // 2. Get Device Users
                    if (!(yield this.connect()))
                        throw new Error('Device offline');
                    const deviceUsersResp = yield this.zk.getUsers();
                    yield this.disconnect();
                    const deviceUsers = (deviceUsersResp === null || deviceUsersResp === void 0 ? void 0 : deviceUsersResp.data) || [];
                    // 3. Compare
                    const missingOnDevice = [];
                    const orphanOnDevice = [];
                    const matched = [];
                    // Map DB users
                    const dbMap = new Map(dbStaff.map((s) => [s.staff_number, s]));
                    // Check Device Users
                    const deviceUserIds = new Set();
                    for (const dUser of deviceUsers) {
                        deviceUserIds.add(dUser.userId);
                        if (dbMap.has(dUser.userId)) {
                            matched.push({
                                staffId: dUser.userId,
                                dbName: ((_b = (_a = dbMap.get(dUser.userId)) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.full_name) || 'Unknown',
                                deviceUser: Object.assign(Object.assign({}, dUser), { fingerCount: 0 // Mocked
                                 })
                            });
                        }
                        else {
                            orphanOnDevice.push(dUser);
                        }
                    }
                    // Check DB Users Missing
                    for (const staff of dbStaff) {
                        if (!deviceUserIds.has(staff.staff_number)) {
                            missingOnDevice.push({
                                staffId: staff.staff_number,
                                name: ((_c = staff.user) === null || _c === void 0 ? void 0 : _c.full_name) || 'Unknown',
                                department: staff.department
                            });
                        }
                    }
                    return {
                        audit: {
                            missingOnDevice,
                            orphanOnDevice,
                            matched
                        }
                    };
                }
                catch (error) {
                    console.error('Audit Error:', error);
                    throw new Error(`Audit failed: ${getErrMsg(error)}`);
                }
            }));
        });
    }
    uploadUsersToDevice() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mutex.run(() => __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    const dbStaff = yield prisma_1.default.staffProfile.findMany({
                        // where: { isActive: true }, 
                        include: { user: { select: { full_name: true } } }
                    });
                    if (!(yield this.connect()))
                        throw new Error('Device offline');
                    let count = 0;
                    for (const staff of dbStaff) {
                        const uid = this.getNumericUid(staff.staff_number);
                        if (uid === 0)
                            continue;
                        yield this.zk.setUser(uid, staff.staff_number, ((_a = staff.user) === null || _a === void 0 ? void 0 : _a.full_name) || 'Staff Member', '', // password
                        0, // role user
                        0 // card
                        );
                        count++;
                    }
                    return { message: `Uploaded ${count} users to device.` };
                }
                catch (error) {
                    throw new Error(`Upload failed: ${getErrMsg(error)}`);
                }
                finally {
                    yield this.disconnect();
                }
            }));
        });
    }
    importUsersFromDevice() {
        return __awaiter(this, void 0, void 0, function* () {
            // Use standard attendance sync logic which usually imports users too if configured, 
            // but here we specifically mean User Data Import (create Staff if not exists? Maybe just log).
            // For safety, we usually don't auto-create staff from device unless requested.
            // Let's just return current users.
            return yield this.getDeviceUsers();
        });
    }
    getAttendanceLogs() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mutex.run(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!(yield this.connect()))
                        throw new Error('Device offline');
                    console.log("Fetching logs from device...");
                    // Allow device to stabilize after connection
                    yield new Promise(r => setTimeout(r, 2000));
                    const logsResp = yield this.zk.getAttendances();
                    const logs = (logsResp === null || logsResp === void 0 ? void 0 : logsResp.data) || [];
                    console.log(`Fetched ${logs.length} raw logs.`);
                    return logs;
                }
                catch (error) {
                    console.error("getAttendanceLogs Error:", JSON.stringify(error));
                    throw new Error(`Fetch logs failed: ${(error === null || error === void 0 ? void 0 : error.message) || 'Unknown Error'}`);
                }
                finally {
                    yield this.disconnect();
                }
            }));
        });
    }
    // --- HEARTBEAT & DAEMON LOGIC ---
    startHeartbeat(intervalMs = 60000) {
        if (this.heartbeatInterval)
            clearInterval(this.heartbeatInterval);
        console.log(`[BiometricDaemon] Starting heartbeat every ${intervalMs / 1000}s`);
        this.heartbeatInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                // Background Status Check
                yield this.getDeviceInfo();
            }
            catch (e) {
                console.error("[BiometricDaemon] Heartbeat error:", e);
            }
        }), intervalMs);
    }
}
exports.BiometricControlService = BiometricControlService;
class BiometricDaemon {
    static start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        console.log("[BiometricDaemon] Initializing background service...");
        // 1. Start Heartbeat
        exports.biometricControl.startHeartbeat(60000); // 1 min status updates
        // 2. Set up Auto-Sync (Every 15 mins)
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("[BiometricDaemon] Running Auto-Sync...");
                yield (0, exports.syncBiometrics)('AUTO');
            }
            catch (e) {
                console.error("[BiometricDaemon] Auto-Sync failed:", e);
            }
        }), 15 * 60 * 1000);
    }
}
exports.BiometricDaemon = BiometricDaemon;
BiometricDaemon.isRunning = false;
exports.biometricControl = new BiometricControlService();
// --- Sync Logic ---
const processBiometricLogs = (logs_1, ...args_1) => __awaiter(void 0, [logs_1, ...args_1], void 0, function* (logs, method = 'MANUAL') {
    console.log(`Processing ${logs.length} logs via AttendanceService...`);
    // Create Sync Log Entry (Initially PENDING/RUNNING)
    const syncLog = yield prisma_1.default.biometricSyncLog.create({
        data: {
            method,
            status: 'RUNNING',
            logs_fetched: logs.length
        }
    });
    try {
        // Adapt logs for AttendanceService
        const adaptedLogs = logs.map(log => {
            var _a, _b, _c, _d;
            return ({
                staff_number: String((_d = (_c = (_b = (_a = log.user_id) !== null && _a !== void 0 ? _a : log.userId) !== null && _b !== void 0 ? _b : log.deviceUserId) !== null && _c !== void 0 ? _c : log.uid) !== null && _d !== void 0 ? _d : ''),
                timestamp: log.record_time || log.recordTime || log.time || new Date()
            });
        }).filter(l => l.staff_number && l.staff_number !== '' && l.timestamp);
        const result = yield service_1.AttendanceService.processBiometricLogs(adaptedLogs);
        // Update Sync Log Success
        yield prisma_1.default.biometricSyncLog.update({
            where: { id: syncLog.id },
            data: {
                status: 'SUCCESS',
                logs_saved: result.success,
                logs_fetched: logs.length
            }
        });
        console.log(`Sync Complete: Success=${result.success}, Failed=${result.failed}`);
        return {
            message: `Processed ${result.success} logs. Failed: ${result.failed}`,
            details: result
        };
    }
    catch (e) {
        yield prisma_1.default.biometricSyncLog.update({
            where: { id: syncLog.id },
            data: {
                status: 'FAILED',
                error_msg: getErrMsg(e)
            }
        });
        throw e;
    }
});
exports.processBiometricLogs = processBiometricLogs;
const syncBiometrics = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (method = 'MANUAL') {
    try {
        console.log(`Starting Biometric Sync (${method})...`);
        // AUTO-DETECT: Try to reach device physically first (Fast Probe)
        const isReachable = yield exports.biometricControl.probeDevice(500);
        if (isReachable) {
            console.log("Device reachable. Using DIRECT connection.");
            const logs = yield exports.biometricControl.getAttendanceLogs();
            if (logs.length === 0) {
                // Log empty sync too for history
                yield prisma_1.default.biometricSyncLog.create({ data: { method, status: 'SUCCESS', logs_fetched: 0, logs_saved: 0 } });
                return { message: 'No logs found on device.' };
            }
            const result = yield (0, exports.processBiometricLogs)(logs, method);
            console.log('Biometric Sync Complete (Direct):', result);
            return result;
        }
        // 1. FALLBACK TO SMART CHECK (Bridge Mode)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLog = yield prisma_1.default.attendanceRecord.findFirst({
            where: {
                method: 'BIOMETRIC',
                updatedAt: { gte: yesterday }
            }
        });
        if (recentLog) {
            return { message: 'Sync managed by Bridge Agent. Status: ACTIVE.' };
        }
        return { message: 'Device unreachable and no Bridge active.' };
    }
    catch (error) {
        console.error('Biometric Sync Failed:', error);
        throw error; // Propagate to controller
    }
});
exports.syncBiometrics = syncBiometrics;
