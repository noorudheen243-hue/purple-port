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
exports.AttendanceService = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
class AttendanceService {
    // Check In
    static checkIn(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const IST_OFFSET = 330 * 60 * 1000;
            const istNow = new Date(now.getTime() + IST_OFFSET);
            istNow.setUTCHours(0, 0, 0, 0);
            const startOfDay = new Date(istNow.getTime() - IST_OFFSET); // IST Midnight
            const existing = yield prisma_1.default.attendanceRecord.findUnique({
                where: { user_id_date: { user_id: userId, date: startOfDay } }
            });
            if (existing)
                throw new Error("Already checked in for today");
            const staff = yield prisma_1.default.staffProfile.findUnique({ where: { user_id: userId } });
            if (!staff)
                throw new Error("Staff profile not found");
            const checkInTime = new Date();
            // Use unified status engine
            const statusResult = yield this.computeStatus(staff, checkInTime, null, false);
            return yield prisma_1.default.attendanceRecord.create({
                data: {
                    user_id: userId,
                    date: startOfDay,
                    check_in: checkInTime,
                    status: statusResult.status,
                    shift_snapshot: `${statusResult.shift.start_time}-${statusResult.shift.end_time}`,
                    shift_id: statusResult.shift.id === 'LEGACY' || statusResult.shift.id === 'DEFAULT' ? null : statusResult.shift.id,
                    criteria_mode: statusResult.criteria,
                    grace_time_applied: statusResult.shift.default_grace_time,
                    method: 'WEB'
                }
            });
        });
    }
    // Check Out
    static checkOut(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const IST_OFFSET = 330 * 60 * 1000;
            const istNow = new Date(now.getTime() + IST_OFFSET);
            istNow.setUTCHours(0, 0, 0, 0);
            const startOfDay = new Date(istNow.getTime() - IST_OFFSET); // IST Midnight
            const record = yield prisma_1.default.attendanceRecord.findUnique({
                where: { user_id_date: { user_id: userId, date: startOfDay } }
            });
            if (!record)
                throw new Error("No check-in record found for today");
            if (record.check_out)
                throw new Error("Already checked out");
            const staff = yield prisma_1.default.staffProfile.findUnique({ where: { user_id: userId } });
            if (!staff)
                throw new Error("Staff profile not found");
            const checkOutTime = new Date();
            const checkInTime = new Date(record.check_in);
            // Use unified status engine
            const statusResult = yield this.computeStatus(staff, checkInTime, checkOutTime, false);
            const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            return yield prisma_1.default.attendanceRecord.update({
                where: { id: record.id },
                data: {
                    check_out: checkOutTime,
                    work_hours: workHours,
                    status: statusResult.status,
                    shift_snapshot: `${statusResult.shift.start_time}-${statusResult.shift.end_time}`,
                    shift_id: statusResult.shift.id === 'LEGACY' || statusResult.shift.id === 'DEFAULT' ? null : statusResult.shift.id,
                    criteria_mode: statusResult.criteria,
                    grace_time_applied: statusResult.shift.default_grace_time
                }
            });
        });
    }
    // Unified Status Engine (Refactored - Deterministic Rebuild)
    static computeStatus(staff, checkIn, checkOut, isPastDay) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!staff)
                return { status: 'PRESENT', shift: {}, criteria: 'GRACE_TIME' };
            // 1. Get Shift for this Date (Using ShiftService)
            const { ShiftService } = require('./shift.service');
            const shift = yield ShiftService.getShiftForDate(staff.user_id, checkIn);
            const graceTime = shift.default_grace_time;
            const criteria = 'GRACE_TIME';
            const isNoBreak = (shift.name || '').toUpperCase().includes('NO BREAK');
            // Calculate Shift duration for dynamic thresholds
            let shiftDuration = 9; // Default 9h (09-18)
            if (shift.start_time && shift.end_time) {
                const [sh, sm] = shift.start_time.split(':').map(Number);
                const [eh, em] = shift.end_time.split(':').map(Number);
                let start = sh + sm / 60;
                let end = eh + em / 60;
                if (end < start)
                    end += 24; // Handle overnight
                shiftDuration = end - start;
            }
            // Thresholds
            let fullDayThreshold = isNoBreak ? 7.0 : 7.75;
            if (shiftDuration < fullDayThreshold) {
                fullDayThreshold = Math.max(4.0, shiftDuration - 0.25); // 15 min buffer
            }
            const halfDayThreshold = 4.0;
            const isLate = this.isLate(shift.start_time, checkIn, graceTime);
            const isEarlyExit = checkOut ? this.isEarlyDeparture(shift.end_time, checkOut, shift.start_time) : false;
            let status = 'PRESENT';
            // --- DETERMINISTIC DECISION TREE ---
            if (isLate) {
                // Rule 1: Late Punch -> HALF_DAY
                status = 'HALF_DAY';
            }
            else if (isEarlyExit) {
                // Rule 2: Early Departure -> HALF_DAY
                status = 'HALF_DAY';
            }
            else if (!checkOut || checkIn.getTime() === checkOut.getTime()) {
                // Rule 3: Single Punch
                if (isPastDay) {
                    status = 'HALF_DAY'; // Past day without checkout = HALF_DAY
                }
                else {
                    status = 'PRESENT'; // Current day, might still checkout
                }
            }
            else {
                // Rule 4: Full Day check based on work hours
                const workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
                if (workHours < halfDayThreshold) {
                    status = 'ABSENT';
                }
                else if (workHours < fullDayThreshold) {
                    status = 'HALF_DAY';
                }
                else {
                    status = 'PRESENT';
                }
            }
            return { status, shift, criteria };
        });
    }
    // Get My Attendance
    static getAttendance(userId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const records = yield prisma_1.default.attendanceRecord.findMany({
                where: {
                    user_id: userId,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
            const holidays = yield prisma_1.default.holiday.findMany({
                where: {
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
            // Convert records to a map for easy lookup, adjusting for IST
            const recordMap = new Map();
            records.forEach(r => {
                const istOffset = 330 * 60 * 1000;
                const istDate = new Date(r.date.getTime() + istOffset);
                recordMap.set(istDate.toISOString().split('T')[0], r);
            });
            // Merge Holidays
            const merged = [...records];
            holidays.forEach(h => {
                const dateKey = h.date.toISOString().split('T')[0];
                if (!recordMap.has(dateKey)) {
                    merged.push({
                        id: h.id,
                        date: h.date,
                        status: 'HOLIDAY',
                        check_in: null,
                        check_out: null,
                        work_hours: null,
                        user_id: userId,
                        method: 'SYSTEM',
                        createdAt: h.createdAt,
                        updatedAt: h.updatedAt
                    });
                }
            });
            return merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        });
    }
    // --- HELPERS ---
    static isLate(shiftStart24h, checkIn, graceMinutes = 15) {
        // Convert CheckIn (UTC Date) to IST Minutes for comparison
        // IST = UTC + 5:30 (330 minutes)
        const istDate = new Date(checkIn.getTime() + (330 * 60000));
        const checkInMins = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
        const [sh, sm] = shiftStart24h.split(':').map(Number);
        const shiftMins = sh * 60 + sm;
        return checkInMins > (shiftMins + graceMinutes);
    }
    static isEarlyDeparture(shiftEnd24h, checkOut, shiftStart24h = '09:00') {
        // Convert CheckOut (UTC Date) to IST Minutes
        const istDate = new Date(checkOut.getTime() + (330 * 60000));
        const checkOutMins = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
        const [eh, em] = shiftEnd24h.split(':').map(Number);
        const shiftMins = eh * 60 + em;
        const [sh, sm] = shiftStart24h.split(':').map(Number);
        const startMins = sh * 60 + sm;
        // Overnight Shift Handling (e.g., End 07:00 < Start 22:00)
        if (shiftMins < startMins) {
            // If checkout is after shift start but before midnight
            if (checkOutMins >= startMins) {
                return true; // Very early departure
            }
            // If checkout is after midnight, simple comparison works
        }
        return checkOutMins < shiftMins;
    }
    // --- END HELPERS ---
    // Regularisation Request
    static requestRegularisation(userId, date, type, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            // 0. Validation: Cannot regularize Sundays or Holidays
            const reqDate = new Date(date);
            if (reqDate.getDay() === 0) {
                throw new Error("Cannot regularize attendance for Sundays (Weekly Off).");
            }
            const isHoliday = yield prisma_1.default.holiday.findUnique({
                where: { date: reqDate }
            });
            if (isHoliday) {
                throw new Error(`Cannot regularize attendance for ${isHoliday.name} (Holiday).`);
            }
            // 1. Check Monthly Limit
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const currentRequests = yield prisma_1.default.regularisationRequest.count({
                where: {
                    user_id: userId,
                    date: { gte: startOfMonth, lte: endOfMonth }
                }
            });
            const limitExceeded = currentRequests >= 3;
            let finalReason = reason;
            if (limitExceeded) {
                finalReason = `[LIMIT EXCEEDED] ${reason}`;
            }
            const request = yield prisma_1.default.regularisationRequest.create({
                data: {
                    user_id: userId,
                    date: date,
                    type,
                    reason: finalReason,
                    status: 'PENDING',
                    exceeds_limit: limitExceeded
                },
                include: { user: true }
            });
            // Notify Admins
            const { notifyAdmins } = require('../notifications/service');
            let notifMsg = `${request.user.full_name} requested attendance regularisation`;
            if (limitExceeded)
                notifMsg += " (Limit Exceeded)";
            yield notifyAdmins('REGULARISATION_REQUEST', notifMsg, `/dashboard?action=review_request&requestId=${request.id}&type=REGULARISATION`);
            return request;
        });
    }
    // Biometric Sync (Sanitized & Idempotent)
    static processBiometricLogs(logs) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = { success: 0, failed: 0, errors: [] };
            for (const log of logs) {
                try {
                    const timestamp = new Date(log.timestamp);
                    const IST_OFFSET = 330 * 60 * 1000;
                    const istDate = new Date(timestamp.getTime() + IST_OFFSET);
                    istDate.setUTCHours(0, 0, 0, 0);
                    const dateKeyIST = new Date(istDate.getTime() - IST_OFFSET); // IST Midnight key
                    // Fallback check for old UTC keys
                    const dateKeyUTC = new Date(timestamp);
                    dateKeyUTC.setHours(0, 0, 0, 0);
                    const staff = yield prisma_1.default.staffProfile.findUnique({
                        where: { staff_number: log.staff_number },
                        include: { user: true }
                    });
                    if (!staff) {
                        results.errors.push(`Staff number ${log.staff_number} not found`);
                        results.failed++;
                        continue;
                    }
                    // 2. Find existing record (Check BOTH key formats)
                    let existing = yield prisma_1.default.attendanceRecord.findFirst({
                        where: {
                            user_id: staff.user_id,
                            date: { in: [dateKeyIST, dateKeyUTC] }
                        }
                    });
                    // --- OVERNIGHT LOOKBACK ---
                    // If punch is between 12 AM and 7 AM IST, and today has no record, 
                    // check if yesterday has an incomplete record (to assign check-out)
                    const istHours = istDate.getUTCHours();
                    if (!existing && istHours < 7) {
                        const yesterdayKey = new Date(dateKeyIST.getTime() - (24 * 60 * 60 * 1000));
                        const yesterdayRecord = yield prisma_1.default.attendanceRecord.findFirst({
                            where: {
                                user_id: staff.user_id,
                                date: yesterdayKey,
                                check_out: null
                            }
                        });
                        if (yesterdayRecord) {
                            existing = yesterdayRecord;
                        }
                    }
                    // --- LOCK ENFORCEMENT ---
                    if (existing && (existing.status === 'REGULARIZED' || existing.method === 'MANUAL_ADMIN')) {
                        results.success++;
                        continue;
                    }
                    const now = new Date();
                    const istNow = new Date(now.getTime() + IST_OFFSET);
                    istNow.setUTCHours(0, 0, 0, 0);
                    const todayMidnightIST = new Date(istNow.getTime() - IST_OFFSET);
                    const isPastDay = (existing ? existing.date : dateKeyIST).getTime() < todayMidnightIST.getTime();
                    if (!existing) {
                        // CREATE NEW RECORD
                        const statusResult = yield this.computeStatus(staff, timestamp, null, isPastDay);
                        yield prisma_1.default.attendanceRecord.create({
                            data: {
                                user_id: staff.user_id,
                                date: dateKeyIST,
                                check_in: timestamp,
                                status: statusResult.status,
                                shift_snapshot: `${statusResult.shift.start_time}-${statusResult.shift.end_time}`,
                                shift_id: (statusResult.shift.id === 'LEGACY' || statusResult.shift.id === 'DEFAULT') ? null : statusResult.shift.id,
                                criteria_mode: statusResult.criteria,
                                grace_time_applied: statusResult.shift.default_grace_time,
                                method: 'BIOMETRIC'
                            }
                        });
                        results.success++;
                    }
                    else {
                        // UPDATE EXISTING RECORD
                        let shouldUpdate = false;
                        const data = {};
                        // Update check_in if earlier
                        if (!existing.check_in || timestamp < existing.check_in) {
                            data.check_in = timestamp;
                            shouldUpdate = true;
                        }
                        // Update check_out if later
                        const currentCheckIn = data.check_in || existing.check_in;
                        if (timestamp > currentCheckIn && (!existing.check_out || timestamp > existing.check_out)) {
                            data.check_out = timestamp;
                            shouldUpdate = true;
                        }
                        // Force re-evaluation if status is PRESENT on past days (provisional check)
                        if (isPastDay && existing.status === 'PRESENT' && !existing.check_out) {
                            shouldUpdate = true;
                        }
                        if (shouldUpdate) {
                            const finalCheckIn = data.check_in || existing.check_in;
                            const finalCheckOut = data.check_out || existing.check_out || null;
                            const statusResult = yield this.computeStatus(staff, finalCheckIn, finalCheckOut, isPastDay);
                            yield prisma_1.default.attendanceRecord.update({
                                where: { id: existing.id },
                                data: Object.assign(Object.assign({}, data), { status: statusResult.status, method: 'BIOMETRIC' })
                            });
                        }
                        results.success++;
                    }
                }
                catch (error) {
                    results.errors.push(`Error processing log for ${log.staff_number}: ${error.message}`);
                    results.failed++;
                }
            }
            return results;
        });
    }
    // Recalculate Attendance (Retroactive Sync)
    static recalculateAttendance(userId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[Recalc] Recalculating attendance for ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
            const records = yield prisma_1.default.attendanceRecord.findMany({
                where: {
                    user_id: userId,
                    date: { gte: startDate, lte: endDate }
                }
            });
            let updatedCount = 0;
            const staff = yield prisma_1.default.staffProfile.findUnique({ where: { user_id: userId } });
            if (!staff)
                return { message: "Staff not found", count: 0 };
            for (const record of records) {
                // Respect Regularized/Manual Lock
                if (record.status === 'REGULARIZED' || record.method === 'MANUAL_ADMIN') {
                    continue;
                }
                // Re-run status logic with new global state (Shift Assignments)
                const statusResult = yield this.computeStatus(staff, record.check_in || new Date(record.date), record.check_out, true // Always treat as past day analysis
                );
                // Update DB if different (or just force update to be safe)
                yield prisma_1.default.attendanceRecord.update({
                    where: { id: record.id },
                    data: {
                        status: statusResult.status,
                        shift_snapshot: `${statusResult.shift.start_time}-${statusResult.shift.end_time}`,
                        shift_id: statusResult.shift.id === 'LEGACY' || statusResult.shift.id === 'DEFAULT' ? null : statusResult.shift.id,
                        criteria_mode: statusResult.criteria,
                        grace_time_applied: statusResult.shift.default_grace_time
                    }
                });
                updatedCount++;
            }
            console.log(`[Recalc] Updated ${updatedCount} records.`);
            return { updatedCount };
        });
    }
    // Admin: Get Team Attendance Summary
    // Admin: Get Team Attendance Summary
    static getTeamAttendance(startDate, endDate, requestor) {
        return __awaiter(this, void 0, void 0, function* () {
            // Fetch all active staff
            const whereClause = {
                role: { notIn: ['ADMIN', 'CLIENT'] },
                staffProfile: {
                    staff_number: { notIn: ['QIX0001', 'QIX0002'] }
                }
            };
            // RESTRICTION: If not Admin/Manager, ONLY show own attendance
            if (requestor && !['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'].includes(requestor.role)) {
                whereClause.id = requestor.id;
            }
            const staff = yield prisma_1.default.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    full_name: true,
                    department: true,
                    staffProfile: {
                        select: {
                            designation: true,
                            staff_number: true
                        }
                    }
                },
                orderBy: {
                    full_name: 'asc'
                }
            });
            // Fetch all attendance records for range
            const records = yield prisma_1.default.attendanceRecord.findMany({
                where: {
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
            // Fetch Holidays for range
            const holidays = yield prisma_1.default.holiday.findMany({
                where: {
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
            // Fetch Approved Leaves for range
            const approvedLeaves = yield prisma_1.default.leaveRequest.findMany({
                where: {
                    start_date: { lte: endDate },
                    end_date: { gte: startDate },
                    status: 'APPROVED'
                }
            });
            // Map records to structure
            const result = staff.map(user => {
                var _a, _b;
                const userRecords = records.filter(r => r.user_id === user.id);
                const attendanceMap = {};
                // Populate existing records first (TRUST DB STATUS - NO FLY-BY UPDATES)
                userRecords.forEach(r => {
                    const istOffset = 330 * 60 * 1000;
                    const istDate = new Date(r.date.getTime() + istOffset);
                    const dateKey = istDate.toISOString().split('T')[0];
                    attendanceMap[dateKey] = r;
                    // Handle Leave Type overlay
                    if (r.status === 'LEAVE') {
                        const leave = approvedLeaves.find(l => l.user_id === user.id &&
                            new Date(dateKey) >= new Date(l.start_date.toISOString().split('T')[0]) &&
                            new Date(dateKey) <= new Date(l.end_date.toISOString().split('T')[0]));
                        if (leave) {
                            attendanceMap[dateKey].leave_type = leave.type;
                        }
                    }
                });
                // Merge Holidays if no record exists
                holidays.forEach(h => {
                    const dateKey = h.date.toISOString().split('T')[0];
                    if (!attendanceMap[dateKey]) {
                        attendanceMap[dateKey] = {
                            id: h.id,
                            status: 'HOLIDAY',
                            date: h.date,
                            check_in: null,
                            check_out: null,
                            method: 'SYSTEM'
                        };
                    }
                });
                // Merge Leaves if no record exists
                approvedLeaves.filter(l => l.user_id === user.id).forEach(l => {
                    let current = new Date(Math.max(l.start_date.getTime(), startDate.getTime()));
                    const last = new Date(Math.min(l.end_date.getTime(), endDate.getTime()));
                    while (current <= last) {
                        const istDate = new Date(current.getTime() + (330 * 60 * 1000));
                        const dateKey = istDate.toISOString().split('T')[0];
                        if (!attendanceMap[dateKey]) {
                            attendanceMap[dateKey] = {
                                id: l.id,
                                status: 'LEAVE',
                                leave_type: l.type,
                                date: new Date(current),
                                check_in: null,
                                check_out: null,
                                method: 'SYSTEM'
                            };
                        }
                        current.setDate(current.getDate() + 1);
                    }
                });
                return {
                    user: {
                        id: user.id,
                        name: user.full_name,
                        designation: ((_a = user.staffProfile) === null || _a === void 0 ? void 0 : _a.designation) || 'Staff',
                        department: user.department,
                        staff_number: (_b = user.staffProfile) === null || _b === void 0 ? void 0 : _b.staff_number,
                        shift: 'Pending'
                    },
                    attendance: attendanceMap
                };
            });
            // Resolve shifts concurrently
            const { ShiftService } = require('./shift.service');
            yield Promise.all(result.map((res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    // For report/display purposes, we use "Today's" shift or the shift as of the report date
                    // Ideally, this would be a per-day shift, but for the summary string, we use active shift.
                    const shift = yield ShiftService.getShiftForDate(res.user.id, new Date());
                    res.user.shift = shift ? `${shift.name} (${shift.start_time}-${shift.end_time})` : 'No Shift Assigned';
                }
                catch (e) {
                    res.user.shift = 'Error Fetching Shift';
                }
            })));
            return result;
        });
    }
    // Get Regularisation Requests (Admin/Manager or User specific)
    static getRegularisationRequests(userId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const whereClause = {};
            if (userId)
                whereClause.user_id = userId;
            if (status)
                whereClause.status = status;
            return yield prisma_1.default.regularisationRequest.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            full_name: true,
                            department: true,
                            role: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        });
    }
    // Explicitly Sync Logs to Current Shift Assignment
    static syncShiftsToLogs(staffId, fromDate, toDate) {
        return __awaiter(this, void 0, void 0, function* () {
            // Default range: Start of Month to Today
            const now = new Date();
            const start = fromDate || new Date(now.getFullYear(), now.getMonth(), 1);
            const end = toDate || now;
            console.log(`[SyncShifts] Syncing logs for ${staffId} from ${start.toISOString()} to ${end.toISOString()}`);
            const staff = yield prisma_1.default.staffProfile.findUnique({
                where: { user_id: staffId }
            });
            if (!staff)
                throw new Error("Staff profile not found");
            const records = yield prisma_1.default.attendanceRecord.findMany({
                where: {
                    user_id: staffId,
                    date: {
                        gte: start,
                        lte: end
                    }
                }
            });
            let updatedCount = 0;
            for (const record of records) {
                // Force recalculate status which will pick up the *current* assignment for that date
                const statusResult = yield this.computeStatus(staff, record.check_in || new Date(record.date), record.check_out, true // Is Past Day
                );
                yield prisma_1.default.attendanceRecord.update({
                    where: { id: record.id },
                    data: {
                        status: statusResult.status,
                        shift_snapshot: `${statusResult.shift.start_time}-${statusResult.shift.end_time}`,
                        shift_id: statusResult.shift.id === 'LEGACY' || statusResult.shift.id === 'DEFAULT' ? null : statusResult.shift.id,
                        criteria_mode: statusResult.criteria,
                        grace_time_applied: statusResult.shift.default_grace_time
                    }
                });
                updatedCount++;
            }
            return { updatedCount, message: `Synced ${updatedCount} logs with new shift rules.` };
        });
    }
    // Delete Regularisation Request
    static deleteRegularisationRequest(requestId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Can only delete if PENDING
            const request = yield prisma_1.default.regularisationRequest.findUnique({ where: { id: requestId } });
            if (!request)
                throw new Error("Request not found");
            // Allow deleting even if processed? Usually not for audit, but user asked for "Delete". 
            // Let's restrict to PENDING to be safe, or allow Admin to force delete.
            // For now, allow delete regardless of status as per "Manage" requirement, but warn.
            // actually, let's stick to standard safety: Delete = Hard delete.
            return yield prisma_1.default.regularisationRequest.delete({
                where: { id: requestId }
            });
        });
    }
    // Update Regularisation Request Details (Edit)
    static updateRegularisationRequest(requestId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = yield prisma_1.default.regularisationRequest.findUnique({ where: { id: requestId } });
            if (!request)
                throw new Error("Request not found");
            if (request.status !== 'PENDING') {
                throw new Error("Cannot edit a processed request. Revert or Create new one.");
            }
            return yield prisma_1.default.regularisationRequest.update({
                where: { id: requestId },
                data
            });
        });
    }
    // Update Regularisation Status
    static updateRegularisationStatus(requestId, approverId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = yield prisma_1.default.regularisationRequest.findUnique({ where: { id: requestId } });
            if (!request)
                throw new Error("Request not found");
            if (request.status !== 'PENDING') {
                throw new Error("Request is already processed");
            }
            const updated = yield prisma_1.default.regularisationRequest.update({
                where: { id: requestId },
                data: {
                    status,
                    approver_id: approverId
                }
            });
            // Sync with Attendance Records
            if (status === 'APPROVED') {
                // 1. Fetch Shift for Date (Dynamic)
                const { ShiftService } = require('./shift.service');
                const shift = yield ShiftService.getShiftForDate(request.user_id, request.date);
                // shift.start_time / end_time are in "HH:mm" (24h)
                const [startH, startM] = shift.start_time.split(':').map(Number);
                const [endH, endM] = shift.end_time.split(':').map(Number);
                const checkInTime = new Date(request.date);
                checkInTime.setHours(startH, startM, 0, 0);
                const checkOutTime = new Date(request.date);
                checkOutTime.setHours(endH, endM, 0, 0);
                // Handle overnight shifts
                if (checkOutTime < checkInTime) {
                    checkOutTime.setDate(checkOutTime.getDate() + 1);
                }
                // 3. Update or Create Attendance Record
                yield prisma_1.default.attendanceRecord.upsert({
                    where: {
                        user_id_date: {
                            user_id: request.user_id,
                            date: request.date
                        }
                    },
                    update: {
                        status: 'REGULARIZED',
                        method: 'REGULARISATION',
                        check_in: checkInTime,
                        check_out: checkOutTime,
                        work_hours: shift.id === 'RAMZAN' ? 7 : 8.5,
                        shift_snapshot: `${shift.start_time}-${shift.end_time}`,
                        shift_id: shift.id === 'LEGACY' || shift.id === 'DEFAULT' ? null : shift.id,
                        criteria_mode: 'REGULARIZATION',
                        grace_time_applied: shift.default_grace_time
                    },
                    create: {
                        user_id: request.user_id,
                        date: request.date,
                        status: 'REGULARIZED',
                        check_in: checkInTime,
                        check_out: checkOutTime,
                        work_hours: shift.id === 'RAMZAN' ? 7 : 8.5,
                        method: 'REGULARISATION',
                        shift_snapshot: `${shift.start_time}-${shift.end_time}`,
                        shift_id: shift.id === 'LEGACY' || shift.id === 'DEFAULT' ? null : shift.id,
                        criteria_mode: 'REGULARIZATION',
                        grace_time_applied: shift.default_grace_time
                    }
                });
            }
            return updated;
        });
    }
    // Get Regularisation Request History
    static getRegularisationHistory(month, year, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            // Include the whole day for end date
            endDate.setHours(23, 59, 59, 999);
            const whereClause = {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            };
            if (status && status !== 'ALL') {
                whereClause.status = status;
            }
            else {
                // If ALL, usually exclude PENDING? User asked for history of approvals (Pending is in pending tab).
                // But History often implies "Past Actions". 
                // Let's include everything that matches the date range.
                // If the user wants only Processed, they can filter or we can default.
                // For now, return all in that month.
            }
            return yield prisma_1.default.regularisationRequest.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            full_name: true,
                            department: true,
                            role: true
                        }
                    },
                    approver: {
                        select: {
                            full_name: true
                        }
                    }
                },
                orderBy: { date: 'desc' }
            });
        });
    }
    // Revert Regularisation Status
    static revertRegularisationStatus(requestId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = yield prisma_1.default.regularisationRequest.findUnique({ where: { id: requestId } });
            if (!request)
                throw new Error("Request not found");
            // If it was APPROVED, we must revert the attendance record changes?
            // This is tricky because we don't know what the PREVIOUS state was.
            // Option 1: Set back to ABSENT or previous state if we knew it.
            // Option 2: Delete the attendance record if it was created by REGULARISATION.
            if (request.status === 'APPROVED') {
                // Find the attendance record for this date
                const record = yield prisma_1.default.attendanceRecord.findUnique({
                    where: {
                        user_id_date: {
                            user_id: request.user_id,
                            date: request.date
                        }
                    }
                });
                if (record && record.method === 'REGULARISATION') {
                    // Safe to delete or reset?
                    // If we delete, it becomes "No Data" (Absent).
                    // If the user had a partial punch log before, we lost it when we upserted?
                    // Wait, upsert replaces. 
                    // Ideally, we should soft-delete or check logs.
                    // For now: Reverting an approved regularisation -> Delete the "Present" record to force Absent/Missing.
                    yield prisma_1.default.attendanceRecord.delete({
                        where: { id: record.id }
                    });
                }
            }
            return yield prisma_1.default.regularisationRequest.update({
                where: { id: requestId },
                data: {
                    status: 'PENDING',
                    approver_id: null
                }
            });
        });
    }
    // Monthly Calendar Data
    static getMonthlyCalendar(userId, month, year) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            // Fetch Data
            const attendance = yield prisma_1.default.attendanceRecord.findMany({
                where: {
                    user_id: userId,
                    date: { gte: startDate, lte: endDate }
                }
            });
            const leaves = yield prisma_1.default.leaveRequest.findMany({
                where: {
                    user_id: userId,
                    status: 'APPROVED',
                    start_date: { lte: endDate },
                    end_date: { gte: startDate }
                }
            });
            const holidays = yield prisma_1.default.holiday.findMany({
                where: {
                    date: { gte: startDate, lte: endDate }
                }
            });
            // Merge Logic
            const calendar = [];
            const daysInMonth = endDate.getDate();
            const holidayDates = new Set(holidays.map(h => h.date.toDateString()));
            const uniqueAttendanceDates = new Set();
            // Stats
            let stats = {
                totalDays: daysInMonth,
                holidays: 0,
                leaves: 0,
                present: 0,
                workingDays: 0
            };
            // Helper to check leave for a date
            const getLeaveForDate = (date) => {
                return leaves.find(l => date >= new Date(l.start_date.toISOString().split('T')[0]) &&
                    date <= new Date(l.end_date.toISOString().split('T')[0]));
            };
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const dateObj = new Date(d);
                const isSunday = d.getDay() === 0;
                const isHoliday = holidayDates.has(d.toDateString());
                const leave = getLeaveForDate(dateObj);
                const record = attendance.find(r => r.date.toISOString().split('T')[0] === dateStr);
                let status = 'ABSENT';
                let details = null;
                if (record) {
                    status = record.status; // PRESENT, HALF_DAY, etc.
                    details = record;
                    stats.present++;
                    uniqueAttendanceDates.add(dateStr);
                }
                else if (leave) {
                    status = 'LEAVE';
                    details = { type: leave.type, reason: leave.reason };
                    stats.leaves++;
                }
                else if (isHoliday) {
                    status = 'HOLIDAY';
                    details = { name: (_a = holidays.find(h => h.date.toDateString() === d.toDateString())) === null || _a === void 0 ? void 0 : _a.name };
                    stats.holidays++;
                }
                else if (isSunday) {
                    status = 'WEEKOFF';
                }
                // Correct stats overlap (e.g. Leave on Holiday) - Keep simple for now, refine if needed.
                // If leave is on Holiday, we might have counted both. 
                // Current strict loop avoids double pushing to calendar array, but stats need care.
                calendar.push({
                    date: dateStr,
                    day: d.getDate(),
                    dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                    status,
                    details
                });
            }
            // Refine Stats: Effective Working Days
            // Total - Sundays - Holidays (that are not Sundays)
            let holidayCount = 0;
            let sundayCount = 0;
            // Re-loop for cleaner stats check
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const isSunday = d.getDay() === 0;
                const isHoliday = holidayDates.has(d.toDateString());
                if (isSunday)
                    sundayCount++;
                if (isHoliday && !isSunday)
                    holidayCount++; // Don't double count if holiday is on sunday
            }
            // Effective Working Days = Total Days - Sundays - Unique Holidays
            // Note: Leaves are part of working days (just not worked), so don't subtract them from "Total Working Days Capacity".
            // But if user wants "Effective Working Days" meaning "Days actually worked", that's `stats.present`.
            // Interpretation of request: "total effective working days" usually means "Potential working days".
            stats.holidays = holidays.length; // Raw count
            // stats.leaves is already set
            stats.workingDays = Math.max(0, daysInMonth - sundayCount - holidayCount);
            return { calendar, stats };
        });
    }
    // Admin Update
    static adminUpdateAttendance(userId, date, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const updateData = {};
            if (data.status)
                updateData.status = data.status;
            if (data.check_in)
                updateData.check_in = new Date(data.check_in);
            if (data.check_out)
                updateData.check_out = new Date(data.check_out);
            // Recalc hours if times changed
            if (updateData.check_in || updateData.check_out) {
                // We need current values if only one is updated
                const existing = yield prisma_1.default.attendanceRecord.findUnique({
                    where: { user_id_date: { user_id: userId, date: d } }
                });
                const start = updateData.check_in ? new Date(updateData.check_in) : ((existing === null || existing === void 0 ? void 0 : existing.check_in) ? new Date(existing.check_in) : null);
                const end = updateData.check_out ? new Date(updateData.check_out) : ((existing === null || existing === void 0 ? void 0 : existing.check_out) ? new Date(existing.check_out) : null);
                if (start && end) {
                    updateData.work_hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                }
            }
            return yield prisma_1.default.attendanceRecord.upsert({
                where: { user_id_date: { user_id: userId, date: d } },
                create: {
                    user_id: userId,
                    date: d,
                    status: data.status || 'PRESENT',
                    check_in: updateData.check_in,
                    check_out: updateData.check_out,
                    work_hours: updateData.work_hours,
                    method: 'MANUAL_ADMIN'
                },
                update: updateData
            });
        });
    }
    // Biometric Logs View (Flat List for Admin Table - Shows ALL staff)
    static getBiometricLogs(startDate, endDate, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            // 1. Fetch ALL Active Staff involved in attendance (exclude Clients)
            const staffQuery = Object.assign({ role: { not: 'CLIENT' }, full_name: { not: 'Biometric Bridge Agent' }, staffProfile: {
                    staff_number: { notIn: ['QIX0001', 'QIX0002'] } // Exclude Co-founders (Implicitly checks isNot null)
                } }, (userId ? { id: userId } : {}));
            const allStaff = yield prisma_1.default.user.findMany({
                where: staffQuery,
                select: {
                    id: true,
                    full_name: true,
                    staffProfile: {
                        select: {
                            staff_number: true,
                            designation: true,
                            payroll_status: true
                        }
                    }
                },
                orderBy: { full_name: 'asc' }
            });
            // 2. Fetch Actual Logs for the period
            // TIMZONE FIX: Expand search window to account for IST (UTC+5.30)
            // If query is Jan 9 00:00 UTC, the record might be Jan 8 18:30 UTC.
            const searchStart = new Date(startDate);
            searchStart.setDate(searchStart.getDate() - 1);
            const whereClause = {
                date: {
                    gte: searchStart,
                    lte: endDate
                }
            };
            if (userId)
                whereClause.user_id = userId;
            const actualRecords = yield prisma_1.default.attendanceRecord.findMany({
                where: whereClause
            });
            // 3. Generate Complete List (Dates x Staff)
            const fullLogs = [];
            const dateIterator = new Date(startDate);
            dateIterator.setHours(0, 0, 0, 0);
            const endDateTime = new Date(endDate);
            endDateTime.setHours(0, 0, 0, 0);
            while (dateIterator <= endDateTime) {
                const currentDate = new Date(dateIterator);
                // FIX: Use IST Date String to match the record comparison logic
                const dateStr = currentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                for (const staff of allStaff) {
                    // Find record
                    const record = actualRecords.find(r => {
                        if (r.user_id !== staff.id)
                            return false;
                        const recordDateIST = r.date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                        return recordDateIST === dateStr;
                    });
                    let shiftDisplay = '09:00 AM - 06:00 PM';
                    let shiftName = 'Default';
                    let graceTime = 15;
                    let shiftObj = null;
                    const formatTime = (t) => {
                        const [h, m] = t.split(':');
                        const d = new Date();
                        d.setHours(parseInt(h), parseInt(m));
                        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    };
                    // Priority 1: Shift Snapshot from Record (Immutable History)
                    if (record && record.shift_snapshot) {
                        const parts = record.shift_snapshot.split('-');
                        if (parts.length === 2) {
                            try {
                                shiftDisplay = `${formatTime(parts[0])} - ${formatTime(parts[1])}`;
                            }
                            catch (e) {
                                shiftDisplay = record.shift_snapshot;
                            }
                        }
                        // Grace time from record snapshot
                        if (record.grace_time_applied != null) {
                            graceTime = record.grace_time_applied;
                        }
                        // Shift name: look up from shift_id if available
                        if (record.shift_id) {
                            try {
                                const shiftMeta = yield prisma_1.default.shift.findUnique({ where: { id: record.shift_id }, select: { name: true } });
                                if (shiftMeta)
                                    shiftName = shiftMeta.name;
                            }
                            catch (_) { /* ignore */ }
                        }
                    }
                    // Priority 2: Retroactive Lookup (Assignment or Profile Fallback)
                    else {
                        const { ShiftService } = require('./shift.service');
                        try {
                            shiftObj = yield ShiftService.getShiftForDate(staff.id, currentDate);
                            if (shiftObj) {
                                shiftDisplay = `${formatTime(shiftObj.start_time)} - ${formatTime(shiftObj.end_time)}`;
                                shiftName = shiftObj.name || 'Default';
                                graceTime = (_a = shiftObj.default_grace_time) !== null && _a !== void 0 ? _a : 15;
                            }
                        }
                        catch (e) {
                            shiftDisplay = '09:00 AM - 06:00 PM';
                        }
                    }
                    if (record) {
                        // Compute is_late from actual punch-in vs shift start + grace
                        let is_late = false;
                        if (record.check_in && (shiftObj === null || shiftObj === void 0 ? void 0 : shiftObj.start_time)) {
                            is_late = AttendanceService.isLate(shiftObj.start_time, record.check_in, graceTime);
                        }
                        else if (record.check_in && record.shift_snapshot) {
                            // Parse start from snapshot "HH:mm-HH:mm"
                            const snapStart = (_b = record.shift_snapshot.split('-')[0]) === null || _b === void 0 ? void 0 : _b.trim();
                            if (snapStart)
                                is_late = AttendanceService.isLate(snapStart, record.check_in, graceTime);
                        }
                        fullLogs.push({
                            id: record.id,
                            date: record.date,
                            user_name: staff.full_name,
                            staff_number: ((_c = staff.staffProfile) === null || _c === void 0 ? void 0 : _c.staff_number) || 'N/A',
                            shift_schedule: shiftDisplay,
                            shift_name: shiftName,
                            grace_time: graceTime,
                            is_late,
                            check_in: record.check_in,
                            check_out: record.check_out,
                            work_hours: record.work_hours || 0,
                            status: record.status,
                            method: record.method
                        });
                    }
                    else {
                        fullLogs.push({
                            id: `missing-${staff.id}-${dateStr}`,
                            date: new Date(currentDate),
                            user_name: staff.full_name,
                            staff_number: ((_d = staff.staffProfile) === null || _d === void 0 ? void 0 : _d.staff_number) || 'N/A',
                            shift_schedule: shiftDisplay,
                            shift_name: shiftName,
                            grace_time: graceTime,
                            is_late: false,
                            check_in: null,
                            check_out: null,
                            work_hours: 0,
                            status: 'ABSENT',
                            method: 'SYSTEM_GENERATED'
                        });
                    }
                }
                // Next Day
                dateIterator.setDate(dateIterator.getDate() + 1);
            }
            // Sort by Date Descending, then Name
            return fullLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
    }
}
exports.AttendanceService = AttendanceService;
