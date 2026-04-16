// @ts-ignore
import ZKLib from 'zkteco-js';
import prisma from '../../utils/prisma';
import { AttendanceService } from './service';
import { randomUUID } from 'node:crypto';


const getErrMsg = (e: any) => e.message || JSON.stringify(e) || 'Unknown Error';


class AsyncMutex {
    private queue: Promise<any> = Promise.resolve();

    run<T>(callback: () => Promise<T>): Promise<T> {
        const result = this.queue.then(() => callback());
        this.queue = result.catch(() => { }); // Ensure queue continues even if task fails
        return result;
    }
}

export class BiometricControlService {
    private zk: any;
    private connected: boolean = false;
    private mutex = new AsyncMutex(); // Concurrency Control
    private heartbeatInterval: NodeJS.Timeout | null = null;

    // Using standard ZK default credentials/ports
    private readonly ip: string = '192.168.1.201';
    private readonly port: number = 4370;
    private readonly timeout: number = 20000;
    private readonly inport: number = 4000;

    constructor() { }

    private async resolveTargetIp(): Promise<string> {
        // Try to reach the device on the local network first
        const localIp = '192.168.1.201';
        const isLocalReachable = await this.probeDevice(localIp, 200);

        if (isLocalReachable) return localIp;

        // Fallback: Get the last known absolute/public IP from the DB
        const status = await prisma.biometricDeviceStatus.findUnique({ where: { id: 'CURRENT' } });
        if (status && status.last_office_ip && status.last_office_ip !== 'unknown') {
            console.log(`[Biometric] Resolving to last known Office Public IP: ${status.last_office_ip} (Registered: ${status.last_office_registration})`);
            return status.last_office_ip;
        }

        return localIp; // Default fallback
    }

    private async connect(targetIp?: string, retries = 2): Promise<boolean> {
        const ip = targetIp || await this.resolveTargetIp();
        
        // Re-initialize ZKLib with the correct IP if needed
        this.zk = new ZKLib(ip, this.port, this.timeout, this.inport);

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Ensure socket is theoretically clean
                if (this.zk && (this.zk as any).ztcp && (this.zk as any).ztcp.socket && !(this.zk as any).ztcp.socket.destroyed) {
                    await this.disconnect();
                }

                // FORCE TCP: Skip zk.createSocket() which toggles UDP/TCP
                // We directly access the ZTCP instance and connect
                await (this.zk as any).ztcp.createSocket(); // Must initialize socket first!
                await (this.zk as any).ztcp.connect();      // Then send handshake
                (this.zk as any).connectionType = 'tcp'; // Manually set flag for library to work

                return true;
            } catch (error) {
                if (attempt === retries) {
                    // console.error(`Biometric Connection Failed after ${retries} attempts.`);
                    return false;
                }
                // Faster retry: 1s instead of 2s
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        return false;
    }

    private async disconnect() {
        try {
            await this.zk.disconnect();
        } catch (e) {
            // console.error("Disconnect error:", e);
        }
    }

    // --- Device Info & Status ---

    async probeDevice(host?: string, timeout = 200): Promise<boolean> {
        const ip = host || await this.resolveTargetIp();

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
            socket.on('error', (e: any) => {
                socket.destroy();
                resolve(false);
            });
            socket.connect(this.port, ip);
        });
    }

    // --- Device Info & Status ---

    async getDeviceInfo() {
        return this.mutex.run(async () => {
            try {
                // AUTO-DETECT: Try to reach device physically first (Fast Probe)
                const isReachable = await this.probeDevice(undefined, 500);

                let info: any;

                if (isReachable) {
                    // We are likely Local / Offline Hosting
                    if (!await this.connect()) throw new Error('Device reachable but refused connection');
                    info = await this.fetchStartDeviceInfo();
                } else {
                    // 1. Check for Active Bridge Heartbeat (Real-time)
                    const status = await prisma.biometricDeviceStatus.findUnique({ where: { id: 'CURRENT' } });
                    const lastBridge = status?.last_bridge_heartbeat;
                    const isBridgeActive = lastBridge && (Date.now() - new Date(lastBridge).getTime() < 120000); // 2 mins

                    if (isBridgeActive) {
                        const dbUserCount = await prisma.staffProfile.count();
                        const dbLogCount = await prisma.attendanceRecord.count({ where: { method: 'BIOMETRIC' } });
                        
                        info = {
                            status: 'ONLINE',
                            deviceName: 'Office Device (Bridge Mode)',
                            serialNumber: 'CONNECTED-VIA-BRIDGE',
                            platform: 'Bridge Agent',
                            deviceTime: new Date(),
                            lastSyncTime: status.last_heartbeat,
                            userCount: dbUserCount,
                            logCount: dbLogCount,
                            isBridge: true
                        };
                    } else {
                        // 2. FALLBACK TO SMART CHECK (Last 24h logs)
                        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                        const recentLog = await prisma.attendanceRecord.findFirst({
                            where: {
                                method: 'BIOMETRIC',
                                updatedAt: { gte: yesterday }
                            },
                            orderBy: { updatedAt: 'desc' }
                        });

                        if (recentLog) {
                            const dbUserCount = await prisma.staffProfile.count();
                            const dbLogCount = await prisma.attendanceRecord.count({ where: { method: 'BIOMETRIC' } });

                            info = {
                                status: 'ONLINE',
                                deviceName: 'Bridge Device (Cached)',
                                serialNumber: 'SYNCED-VIA-BRIDGE',
                                platform: 'Bridge',
                                deviceTime: new Date(),
                                lastSyncTime: recentLog.updatedAt,
                                userCount: dbUserCount,
                                logCount: dbLogCount
                            };
                        } else {
                            info = {
                                status: 'OFFLINE',
                                error: 'Device unreachable and no active bridge agent seen recently.'
                            };
                        }
                    }
                }

                // Update Status Table
                await prisma.biometricDeviceStatus.upsert({
                    where: { id: 'CURRENT' },
                    create: { 
                        id: 'CURRENT', 
                        status: info.status, 
                        last_heartbeat: new Date(), 
                        device_info: JSON.stringify(info),
                        updatedAt: new Date()
                    },
                    update: { 
                        status: info.status, 
                        last_heartbeat: new Date(), 
                        device_info: JSON.stringify(info),
                        updatedAt: new Date()
                    }
                }).catch(() => { });

                return info;

            } catch (error: any) {
                const errInfo = {
                    status: 'OFFLINE',
                    error: getErrMsg(error)
                };
                await prisma.biometricDeviceStatus.upsert({
                    where: { id: 'CURRENT' },
                    create: { 
                        id: 'CURRENT', 
                        status: 'OFFLINE', 
                        last_heartbeat: new Date(), 
                        device_info: JSON.stringify(errInfo),
                        updatedAt: new Date()
                    },
                    update: { 
                        status: 'OFFLINE', 
                        last_heartbeat: new Date(), 
                        device_info: JSON.stringify(errInfo),
                        updatedAt: new Date()
                    }
                }).catch(() => { });
                return errInfo;
            } finally {
                await this.disconnect();
            }
        });
    }

    private async fetchStartDeviceInfo() {
        // Fail-Fast Helper
        const cmd = async (p: Promise<any>) => {
            try { return await p; }
            catch (e: any) {
                const msg = e?.message || e?.toString() || '';
                if (msg.includes('TIMEOUT')) throw e;
                return 'Unknown';
            }
        };

        const deviceName = await cmd(this.zk.getDeviceName());
        const serialNumber = await cmd(this.zk.getSerialNumber());
        const firmware = await cmd(this.zk.getFirmware());
        const platform = await cmd(this.zk.getPlatform());

        let time = new Date();
        try { time = await this.zk.getTime(); }
        catch (e: any) { if (e?.message?.includes('TIMEOUT')) throw e; }

        // Get counts
        let userCount = 0;
        try {
            const users = await this.zk.getUsers();
            userCount = users?.data?.length || 0;
        } catch (e: any) { if (e?.message?.includes('TIMEOUT')) throw e; }

        let logCount = 0;
        try {
            const logsResp = await this.zk.getAttendances();
            const logs = logsResp?.data || [];
            const now = new Date();

            logCount = logs.filter((l: any) => {
                const logDate = new Date(l.recordTime || l.record_time);
                return logDate.getDate() === now.getDate() &&
                    logDate.getMonth() === now.getMonth() &&
                    logDate.getFullYear() === now.getFullYear();
            }).length;
        }
        catch (e: any) { if (e?.message?.includes('TIMEOUT')) throw e; }

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
    }

    async getDeviceUsers() {
        return this.mutex.run(async () => {
            try {
                // 1. SMART CHECK: Fail-Fast for Bridge Mode
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentLog = await prisma.attendanceRecord.findFirst({
                    where: {
                        method: 'BIOMETRIC',
                        updatedAt: { gte: yesterday }
                    }
                });

                if (recentLog) {
                    // Fetch real staff list from DB to show as "Enrolled Users" in Bridge Mode
                    const dbStaff = await prisma.staffProfile.findMany({
                        include: { user: { select: { full_name: true } } }
                    });

                    const mappedUsers = dbStaff.map(s => ({
                        uid: parseInt(s.staff_number.replace(/\D/g, '')) || 0, // Extract number from QIX001
                        userId: s.staff_number,
                        name: s.user?.full_name || 'Unknown',
                        role: 0,
                        cardno: 0,
                        fingerCount: 0
                    }));

                    return { data: mappedUsers };
                }

                // 2. Physical Connect
                if (!await this.connect()) throw new Error('Device offline');
                const users = await this.zk.getUsers();

                // zkteco-js does not support getTemplates, so fingerCount is 0 for now.
                // users.data structure: { uid, userId, name, password, role, cardno }
                const usersWithFingerBytes = users?.data?.map((u: any) => ({
                    ...u,
                    fingerCount: 0 // Not supported by library
                })) || [];

                return { data: usersWithFingerBytes };
            } catch (error: any) {
                // If standard connection fails, we just throw/return error. 
                // We don't need fallback here because if bridge was active we would have caught it above.
                throw new Error(`Failed to fetch users: ${getErrMsg(error)}`);
            } finally {
                await this.disconnect();
            }
        });
    }

    async restartDevice() {
        return this.runCommandOrEnqueue('RESTART', null, async () => {
            await this.zk.executeCmd(8); // CMD_RESTART = 8
            return { message: 'Device restarting...' };
        });
    }

    async syncDeviceTime() {
        return this.runCommandOrEnqueue('SYNC_TIME', null, async () => {
            await this.zk.setTime(new Date());
            return { message: 'Device time synchronized.' };
        });
    }

    async clearAttendanceLogs() {
        return this.runCommandOrEnqueue('CLEAR_LOGS', null, async () => {
            await this.zk.clearAttendanceLog();
            return { message: 'Attendance logs cleared.' };
        });
    }

    // --- User Management ---

    private getNumericUid(staffId: string): number {
        const match = staffId.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }

    async setUserOnDevice(data: { uid?: number, userId: string, name: string, role?: number, password?: string, cardno?: number }) {
        return this.runCommandOrEnqueue('SET_USER', data, async () => {
            const uid = data.uid || this.getNumericUid(data.userId);
            if (uid === 0) throw new Error('Invalid User ID');
            await this.zk.setUser(uid, data.userId, data.name, data.password || '', data.role || 0, data.cardno || 0);
            return { message: `User ${data.userId} synced.` };
        });
    }

    async deleteUserFromDevice(userId: string) {
        return this.runCommandOrEnqueue('DELETE_USER', { userId }, async () => {
            const uid = this.getNumericUid(userId);
            await this.zk.deleteUser(uid);
            return { message: `User ${userId} deleted.` };
        });
    }

    // --- Internal Command Helpers ---

    private async runCommandOrEnqueue(command: string, params: any, directAction: () => Promise<any>): Promise<any> {
        return this.mutex.run(async () => {
            try {
                // 1. Try Direct Connect (Local Network or Port Forwarded)
                if (await this.connect()) {
                    try {
                        const result = await directAction();
                        return result;
                    } finally {
                        await this.disconnect();
                    }
                }
            } catch (e) {
                console.log(`[Biometric] Direct connection failed for ${command}, checking bridge...`);
            }

            // 2. Fallback to Bridge Queue
            const status = await prisma.biometricDeviceStatus.findUnique({ where: { id: 'CURRENT' } });
            const lastBridge = status?.last_bridge_heartbeat;
            const isBridgeActive = lastBridge && (Date.now() - new Date(lastBridge).getTime() < 120000); // 2 mins

            if (isBridgeActive) {
                await prisma.biometricCommand.create({
                    data: {
                        id: randomUUID(),
                        command,
                        params: params ? JSON.stringify(params) : null,
                        status: 'PENDING'
                    }
                });
                return { 
                    message: `Device is remote. Action "${command}" queued for Bridge Agent.`,
                    queued: true 
                };
            }

            throw new Error(`Device unreachable and no active Bridge Agent detected (Last seen: ${lastBridge ? new Date(lastBridge).toLocaleString() : 'Never'}).`);
        });
    }

    // --- Bridge Management Endpoints ---

    async getPendingCommands() {
        const commands = await prisma.biometricCommand.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' }
        });

        // Mark as SENT
        if (commands.length > 0) {
            await prisma.biometricCommand.updateMany({
                where: { id: { in: commands.map(c => c.id) } },
                data: { status: 'SENT' }
            });
        }

        return commands;
    }

    async updateCommandStatus(id: string, status: 'SUCCESS' | 'FAILED', result?: string) {
        return await prisma.biometricCommand.update({
            where: { id },
            data: { status, result, updatedAt: new Date() }
        });
    }

    async startEnrollment(staffNumber: string, fingerIndex: number) {
        throw new Error("Feature Removed: Remote enrollment is disabled.");
    }

    async syncTemplates() {
        throw new Error("Template sync not supported by current driver version.");
    }

    // --- High Level Sync & Audit ---

    async auditUserSync() {
        return this.mutex.run(async () => {
            try {
                // 1. Get DB Users
                const dbStaff = await prisma.staffProfile.findMany({
                    // where: { isActive: true }, // Removed invalid field
                    include: { user: { select: { full_name: true } } }
                });

                // 2. Get Device Users
                if (!await this.connect()) throw new Error('Device offline');
                const deviceUsersResp = await this.zk.getUsers();
                await this.disconnect();
                const deviceUsers = deviceUsersResp?.data || [];

                // 3. Compare
                const missingOnDevice: any[] = [];
                const orphanOnDevice: any[] = [];
                const matched: any[] = [];

                // Map DB users
                const dbMap = new Map(dbStaff.map((s: any) => [s.staff_number, s]));

                // Check Device Users
                const deviceUserIds = new Set();
                for (const dUser of deviceUsers) {
                    deviceUserIds.add(dUser.userId);
                    if (dbMap.has(dUser.userId)) {
                        matched.push({
                            staffId: dUser.userId,
                            dbName: dbMap.get(dUser.userId)?.user?.full_name || 'Unknown',
                            deviceUser: {
                                ...dUser,
                                fingerCount: 0 // Mocked
                            }
                        });
                    } else {
                        orphanOnDevice.push(dUser);
                    }
                }

                // Check DB Users Missing
                for (const staff of dbStaff) {
                    if (!deviceUserIds.has(staff.staff_number)) {
                        missingOnDevice.push({
                            staffId: staff.staff_number,
                            name: staff.user?.full_name || 'Unknown',
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

            } catch (error: any) {
                console.error('Audit Error:', error);
                throw new Error(`Audit failed: ${getErrMsg(error)}`);
            }
        });
    }

    async uploadUsersToDevice() {
        return this.mutex.run(async () => {
            try {
                const dbStaff = await prisma.staffProfile.findMany({
                    // where: { isActive: true }, 
                    include: { user: { select: { full_name: true } } }
                });

                if (!await this.connect()) throw new Error('Device offline');

                let count = 0;
                for (const staff of dbStaff) {
                    const uid = this.getNumericUid(staff.staff_number);
                    if (uid === 0) continue;

                    await this.zk.setUser(
                        uid,
                        staff.staff_number,
                        staff.user?.full_name || 'Staff Member',
                        '', // password
                        0,  // role user
                        0   // card
                    );
                    count++;
                }
                return { message: `Uploaded ${count} users to device.` };
            } catch (error: any) {
                throw new Error(`Upload failed: ${getErrMsg(error)}`);
            } finally {
                await this.disconnect();
            }
        });
    }

    async importUsersFromDevice() {
        // Use standard attendance sync logic which usually imports users too if configured, 
        // but here we specifically mean User Data Import (create Staff if not exists? Maybe just log).
        // For safety, we usually don't auto-create staff from device unless requested.
        // Let's just return current users.
        return await this.getDeviceUsers();
    }

    async getUnlinkedDeviceUsers() {
        return this.mutex.run(async () => {
            try {
                let deviceUsers: any[] = [];

                // 1. Check if device is physically reachable FIRST (Fail-Fast)
                const isReachable = await this.probeDevice(undefined, 500);

                if (isReachable) {
                    try {
                        if (await this.connect()) {
                            const deviceUsersResp = await this.zk.getUsers();
                            deviceUsers = deviceUsersResp?.data || [];
                            await this.disconnect();
                        }
                    } catch (e) {
                        console.error("Direct connect failed for unlinked users:", e);
                    }
                }

                // 2. Fallback to Bridge Cache
                if (deviceUsers.length === 0) {
                    const status = await prisma.biometricDeviceStatus.findUnique({ where: { id: 'CURRENT' } });
                    if (status && status.device_info) {
                        const info = JSON.parse(status.device_info);
                        deviceUsers = info.deviceUsers || [];
                    }
                }

                // Get all existing biometric credentials from DB (Legacy/Direct)
                const existingCredentials = await prisma.biometricCredential.findMany({ select: { staff_number: true } });
                const linkedUserIds = new Set(existingCredentials.map(c => c.staff_number));

                // Get all mapped devices from DB (New Method)
                const linkedStaffProfiles = await prisma.staffProfile.findMany({
                    where: { biometric_device_id: { not: null } },
                    select: { biometric_device_id: true, staff_number: true }
                });
                const linkedStaffDeviceIds = new Set(linkedStaffProfiles.map(s => s.biometric_device_id));
                const linkedStaffNumbers = new Set(linkedStaffProfiles.map(s => s.staff_number));

                // Filter device users to only include those NOT in the credentials table or mapped
                const unlinkedUsers = deviceUsers.filter((u: any) => {
                    const uidStr = String(u.userId);
                    return !linkedUserIds.has(uidStr) &&
                        !linkedStaffDeviceIds.has(uidStr) &&
                        !linkedStaffNumbers.has(uidStr);
                });

                return { data: unlinkedUsers };
            } catch (error: any) {
                throw new Error(`Failed to fetch unlinked users: ${getErrMsg(error)}`);
            }
        });
    }

    async linkDeviceUser(deviceUserId: string, staffProfileId: string) {
        return this.mutex.run(async () => {
            try {
                // 1. Fetch the selected Staff Profile
                const staff = await prisma.staffProfile.findUnique({
                    where: { id: staffProfileId },
                    select: { staff_number: true, user: { select: { full_name: true } } }
                });

                if (!staff) throw new Error("Staff profile not found.");

                // 2. Map the ID explicitly onto the Staff Profile
                await prisma.staffProfile.update({
                    where: { id: staffProfileId },
                    data: { biometric_device_id: String(deviceUserId) }
                });

                return { message: `Device User ${deviceUserId} successfully linked to ${staff.user?.full_name} (${staff.staff_number}).` };
            } catch (error: any) {
                throw new Error(`Failed to link user: ${getErrMsg(error)}`);
            }
        });
    }

    async cacheDeviceUsers(users: any[]) {
        const status = await prisma.biometricDeviceStatus.findUnique({ where: { id: 'CURRENT' } });
        let info = status && status.device_info ? JSON.parse(status.device_info) : {};
        info.deviceUsers = users;

        await prisma.biometricDeviceStatus.upsert({
            where: { id: 'CURRENT' },
            create: { 
                id: 'CURRENT', 
                status: 'ONLINE', 
                last_heartbeat: new Date(), 
                device_info: JSON.stringify(info),
                updatedAt: new Date()
            },
            update: { 
                last_heartbeat: new Date(), 
                device_info: JSON.stringify(info),
                updatedAt: new Date()
            }
        });
        return { message: "Cache updated" };
    }

    async getAttendanceLogs() {
        return this.mutex.run(async () => {
            try {
                if (!await this.connect()) throw new Error('Device offline');

                console.log("Fetching logs from device...");

                // Allow device to stabilize after connection
                await new Promise(r => setTimeout(r, 2000));

                const logsResp = await this.zk.getAttendances();
                const logs = logsResp?.data || [];

                console.log(`Fetched ${logs.length} raw logs.`);
                return logs;
            } catch (error: any) {
                console.error("getAttendanceLogs Error:", JSON.stringify(error));
                throw new Error(`Fetch logs failed: ${error?.message || 'Unknown Error'}`);
            } finally {
                await this.disconnect();
            }
        });
    }

    // --- HEARTBEAT & DAEMON LOGIC ---
    startHeartbeat(intervalMs = 60000) {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

        console.log(`[BiometricDaemon] Starting heartbeat every ${intervalMs / 1000}s`);

        this.heartbeatInterval = setInterval(async () => {
            try {
                // Background Status Check
                await this.getDeviceInfo();
            } catch (e) {
                console.error("[BiometricDaemon] Heartbeat error:", e);
            }
        }, intervalMs);
    }
}

export class BiometricDaemon {
    private static isRunning = false;

    static start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log("[BiometricDaemon] Initializing background service...");

        // 1. Start Heartbeat
        biometricControl.startHeartbeat(60000); // 1 min status updates

        // 2. Start Sync Daemon
        this.startAttendanceSyncDaemon();
    }

    static startAttendanceSyncDaemon() {
        console.log("Biometric Attendance Sync Daemon Started.");

        const runSync = async () => {
            try {
                console.log("[BiometricDaemon] Running Auto-Sync...");
                await syncBiometrics('AUTO');
            } catch (error) {
                console.error("[BiometricDaemon] Sync failed:", error);
            }
        };

        // Run immediately on startup
        runSync();

        // Run every 15 minutes
        setInterval(runSync, 15 * 60 * 1000);
    }
}

export const biometricControl = new BiometricControlService();

// --- Sync Logic ---

export const processBiometricLogs = async (logs: any[], method: 'MANUAL' | 'AUTO' = 'MANUAL') => {
    console.log(`Processing ${logs.length} logs via AttendanceService...`);

    // Create Sync Log Entry (Initially PENDING/RUNNING)
    const syncLog = await prisma.biometricSyncLog.create({
        data: {
            id: randomUUID(),
            method,
            status: 'RUNNING',
            logs_fetched: logs.length
        }
    });

    try {
        // Adapt logs for AttendanceService
        const adaptedLogs = logs.map(log => ({
            staff_number: String(log.user_id ?? log.userId ?? log.deviceUserId ?? log.uid ?? ''),
            timestamp: log.record_time || log.recordTime || log.time || new Date()
        })).filter(l => l.staff_number && l.staff_number !== '' && l.timestamp);

        const result = await AttendanceService.processBiometricLogs(adaptedLogs);

        // Update Sync Log Success
        await prisma.biometricSyncLog.update({
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
    } catch (e: any) {
        await prisma.biometricSyncLog.update({
            where: { id: syncLog.id },
            data: {
                status: 'FAILED',
                error_msg: getErrMsg(e)
            }
        });
        throw e;
    }
};

export const syncBiometrics = async (method: 'MANUAL' | 'AUTO' = 'MANUAL') => {
    try {
        console.log(`Starting Biometric Sync (${method})...`);

        // AUTO-DETECT: Try to reach device physically first (Fast Probe)
        const isReachable = await biometricControl.probeDevice(undefined, 500);

        if (isReachable) {
            console.log("Device reachable. Using DIRECT connection.");
            const logs = await biometricControl.getAttendanceLogs();
            if (logs.length === 0) {
                // Log empty sync too for history
                await prisma.biometricSyncLog.create({ 
                    data: { 
                        id: randomUUID(),
                        method, 
                        status: 'SUCCESS', 
                        logs_fetched: 0, 
                        logs_saved: 0 
                    } 
                });
                return { message: 'No logs found on device.' };
            }

            const result = await processBiometricLogs(logs, method);
            console.log('Biometric Sync Complete (Direct):', result);
            return result;
        }

        // 1. FALLBACK TO SMART CHECK (Bridge Mode)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLog = await prisma.attendanceRecord.findFirst({
            where: {
                method: 'BIOMETRIC',
                updatedAt: { gte: yesterday }
            }
        });

        if (recentLog) {
            return { message: 'Sync managed by Bridge Agent. Status: ACTIVE.' };
        }

        const status = await prisma.biometricDeviceStatus.findUnique({ where: { id: 'CURRENT' } });
        if (!status?.last_office_ip) {
            return { message: 'OFFLINE: Office IP not yet registered today. Someone must login from office once.' };
        }

        return { message: `OFFLINE: Device unreachable at ${status.last_office_ip}. Check Port Forwarding (4370).` };

    } catch (error: any) {
        console.error('Biometric Sync Failed:', error);
        throw error; // Propagate to controller
    }
};
