// @ts-ignore
import ZKLib from 'zkteco-js';
import prisma from '../../utils/prisma';


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

    // Using standard ZK default credentials/ports
    private readonly ip: string = '192.168.1.201';
    private readonly port: number = 4370;
    private readonly timeout: number = 5000;
    private readonly inport: number = 4000;

    constructor() {
        // Initialize ZKLib
        this.zk = new ZKLib(this.ip, this.port, this.timeout, this.inport);
    }

    private async connect(retries = 2): Promise<boolean> {
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

    async getDeviceInfo() {
        return this.mutex.run(async () => {
            try {
                // 1. SMART CHECK: Check for recent Bridge stats first (Instant)
                // If the bridge pushed data in the last 24 hours, assume ONLINE.
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

                    return {
                        status: 'ONLINE',
                        deviceName: 'Bridge Device (VPS Mode)',
                        serialNumber: 'SYNCED-VIA-BRIDGE',
                        firmware: 'N/A',
                        platform: 'Bridge',
                        deviceTime: new Date(),
                        userCount: dbUserCount,
                        logCount: dbLogCount
                    };
                }

                // 2. PHYSICAL CHECK: Only try connecting if no recent data (Slow)
                if (!await this.connect()) throw new Error('Could not connect to device');

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
            } catch (error: any) {
                return {
                    status: 'OFFLINE',
                    error: getErrMsg(error)
                };
            } finally {
                await this.disconnect();
            }
        });
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
        return this.mutex.run(async () => {
            try {
                if (!await this.connect()) throw new Error('Device offline');
                await this.zk.executeCmd(8); // CMD_RESTART = 8
                return { message: 'Device restarting...' };
            } catch (error: any) {
                throw new Error(`Restart failed: ${getErrMsg(error)}`);
            } finally {
                await this.disconnect();
            }
        });
    }

    async syncDeviceTime() {
        return this.mutex.run(async () => {
            try {
                if (!await this.connect()) throw new Error('Device offline');
                await this.zk.setTime(new Date());
                return { message: 'Device time synchronized with server.' };
            } catch (error: any) {
                throw new Error(`Time sync failed: ${getErrMsg(error)}`);
            } finally {
                await this.disconnect();
            }
        });
    }

    async clearAttendanceLogs() {
        return this.mutex.run(async () => {
            try {
                if (!await this.connect()) throw new Error('Device offline');
                await this.zk.clearAttendanceLog();
                return { message: 'All attendance logs cleared from device.' };
            } catch (error: any) {
                throw new Error(`Clear logs failed: ${getErrMsg(error)}`);
            } finally {
                await this.disconnect();
            }
        });
    }

    // --- User Management ---

    private getNumericUid(staffId: string): number {
        const match = staffId.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }

    async setUserOnDevice(data: { uid?: number, userId: string, name: string, role?: number, password?: string, cardno?: number }) {
        return this.mutex.run(async () => {
            try {
                if (!await this.connect()) throw new Error('Device offline');

                const uid = data.uid || this.getNumericUid(data.userId);
                if (uid === 0) throw new Error('Invalid User ID format. Must contain numbers.');

                await this.zk.setUser(
                    uid,
                    data.userId,
                    data.name,
                    data.password || '',
                    data.role || 0,
                    data.cardno || 0
                );
                return { message: `User ${data.userId} added/updated.` };
            } catch (error: any) {
                throw new Error(`Set user failed: ${getErrMsg(error)}`);
            } finally {
                await this.disconnect();
            }
        });
    }

    async deleteUserFromDevice(userId: string) {
        return this.mutex.run(async () => {
            try {
                if (!await this.connect()) throw new Error('Device offline');
                const uid = this.getNumericUid(userId);
                await this.zk.deleteUser(uid);
                return { message: `User ${userId} deleted.` };
            } catch (error: any) {
                throw new Error(`Delete user failed: ${getErrMsg(error)}`);
            } finally {
                await this.disconnect();
            }
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

    async getAttendanceLogs() {
        return this.mutex.run(async () => {
            try {
                if (!await this.connect()) throw new Error('Device offline');

                console.log("Fetching logs from device...");
                // Race condition: If device hangs during data transfer, abort after 20s
                const logsPromise = this.zk.getAttendances();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Device Timeout during log fetch')), 20000)
                );

                const logs: any = await Promise.race([logsPromise, timeoutPromise]);
                console.log(`Fetched ${logs?.data?.length} raw logs.`);
                return logs?.data || [];
            } catch (error: any) {
                console.error("getAttendanceLogs Error:", error);
                throw new Error(`Fetch logs failed: ${error.message}`);
            } finally {
                await this.disconnect();
            }
        });
    }
}

export const biometricControl = new BiometricControlService();

// --- Sync Logic ---

export const processBiometricLogs = async (logs: any[]) => {
    console.log(`Processing ${logs.length} logs...`);

    // 1. Get All Staff Map
    const staffList = await prisma.staffProfile.findMany({
        select: { staff_number: true, user_id: true }
    });
    // Create map that handles string comparison
    const staffMap = new Map(staffList.map(s => [String(s.staff_number), s.user_id]));

    let processed = 0;
    let skipped = 0;

    // 2. Iterate Logs
    for (const log of logs) {
        // log structure: { userSn, deviceUserId, recordTime, ip }
        // Ensure deviceUserId is treated as string for lookup
        const staffNumber = String(log.user_id);
        const userId = staffMap.get(staffNumber);

        if (!userId) {
            console.warn(`[Sync skipped] Unknown Staff Number on Device: ${staffNumber} (Type: ${typeof log.user_id})`);
            skipped++;
            continue;
        }

        const logTime = new Date(log.record_time);
        if (isNaN(logTime.getTime())) {
            console.warn(`[Sync skipped] Invalid Time: ${log.record_time}`);
            skipped++;
            continue;
        }

        // Date Only for identifying the record day (Use local date logic to avoid UTC shifts)
        const dateKey = new Date(logTime);
        dateKey.setHours(0, 0, 0, 0);

        // 3. Find/Create Record
        const existing = await prisma.attendanceRecord.findUnique({
            where: {
                user_id_date: {
                    user_id: userId,
                    date: dateKey
                }
            }
        });

        if (!existing) {
            // New Record -> Check In
            await prisma.attendanceRecord.create({
                data: {
                    user_id: userId,
                    date: dateKey,
                    check_in: logTime,
                    status: 'PRESENT',
                    method: 'BIOMETRIC'
                }
            });
        } else {
            // Existing Record -> Update Logic
            let updateData: any = {};
            let shouldUpdate = false;

            // Update Check-In if earlier
            if (existing.check_in && logTime < existing.check_in) {
                updateData.check_in = logTime;
                shouldUpdate = true;
            } else if (!existing.check_in) {
                updateData.check_in = logTime;
                shouldUpdate = true;
            }

            // Update Check-Out if later (always take latest punch)
            const isAfterCheckIn = existing.check_in ? logTime.getTime() > existing.check_in.getTime() : true;

            if (isAfterCheckIn && (!existing.check_out || logTime > existing.check_out)) {
                updateData.check_out = logTime;
                shouldUpdate = true;
            }

            // Recalculate Work Hours
            const finalCheckIn = updateData.check_in || existing.check_in;
            const finalCheckOut = updateData.check_out || existing.check_out;

            if (finalCheckIn && finalCheckOut) {
                const durationMs = finalCheckOut.getTime() - finalCheckIn.getTime();
                const hours = durationMs / (1000 * 60 * 60);
                updateData.work_hours = hours;
                updateData.status = hours < 4 ? 'HALF_DAY' : 'PRESENT';
                shouldUpdate = true;
            }

            // Ensure we claim this record as BIOMETRIC so the Status Check finds it
            updateData.method = 'BIOMETRIC';

            if (shouldUpdate) {
                await prisma.attendanceRecord.update({
                    where: { id: existing.id },
                    data: updateData
                });
            } else {
                // FORCE HEARTBEAT: Update updatedAt AND method
                await prisma.attendanceRecord.update({
                    where: { id: existing.id },
                    data: {
                        updatedAt: new Date(),
                        method: 'BIOMETRIC'
                    }
                });
            }
        }
        processed++;
    }
    console.log(`Sync Complete: ${processed} processed, ${skipped} skipped.`);
    return { message: `Processed ${processed} logs. Skipped ${skipped} unknown/invalid.` };
};

export const syncBiometrics = async () => {
    try {
        console.log('Starting Biometric Sync...');

        // 1. SMART CHECK: Am I in Bridge Mode?
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLog = await prisma.attendanceRecord.findFirst({
            where: {
                method: 'BIOMETRIC',
                updatedAt: { gte: yesterday }
            }
        });

        if (recentLog) {
            // In Bridge Mode, we don't need to manually pull. 
            // The bridge pushes automatically. 
            // Just return success to stop the UI from spinning.
            return { message: 'Sync managed by Bridge Agent. Status: ACTIVE.' };
        }

        // 2. Physical Pull (Only for Local Server)
        const logs = await biometricControl.getAttendanceLogs();
        if (logs.length === 0) return { message: 'No logs found on device.' };

        const result = await processBiometricLogs(logs);
        console.log('Biometric Sync Complete:', result);
        return result;
    } catch (error: any) {
        console.error('Biometric Sync Failed:', error);
        throw error; // Propagate to controller
    }
};
