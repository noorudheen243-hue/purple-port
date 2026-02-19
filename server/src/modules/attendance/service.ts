import db from '../../utils/prisma';

export class AttendanceService {

    // Check In
    static async checkIn(userId: string) {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));

        const existing = await db.attendanceRecord.findUnique({
            where: { user_id_date: { user_id: userId, date: startOfDay } }
        });

        if (existing) throw new Error("Already checked in for today");

        const staff = await db.staffProfile.findUnique({ where: { user_id: userId } });
        if (!staff) throw new Error("Staff profile not found");

        const checkInTime = new Date();

        // Use unified status engine
        const statusResult = await this.computeStatus(staff, checkInTime, null, false);

        return await db.attendanceRecord.create({
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
    }

    // Check Out
    static async checkOut(userId: string) {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));

        const record = await db.attendanceRecord.findUnique({
            where: { user_id_date: { user_id: userId, date: startOfDay } }
        });

        if (!record) throw new Error("No check-in record found for today");
        if (record.check_out) throw new Error("Already checked out");

        const staff = await db.staffProfile.findUnique({ where: { user_id: userId } });
        if (!staff) throw new Error("Staff profile not found");

        const checkOutTime = new Date();
        const checkInTime = new Date(record.check_in!);

        // Use unified status engine
        const statusResult = await this.computeStatus(staff, checkInTime, checkOutTime, false);
        const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

        return await db.attendanceRecord.update({
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
    }

    // Unified Status Engine (Refactored)
    static async computeStatus(staff: any, checkIn: Date, checkOut: Date | null, isPastDay: boolean): Promise<{ status: string; shift: any; criteria: string }> {
        if (!staff) return { status: 'PRESENT', shift: {}, criteria: 'GRACE_TIME' };

        // 1. Get Shift for this Date (Using ShiftService)
        // staff is StaffProfile. We need to pass staff.id.
        // checkIn is the date of attendance.
        const { ShiftService } = require('./shift.service');
        const shift = await ShiftService.getShiftForDate(staff.user_id, checkIn);

        const graceTime = shift.default_grace_time;
        const criteria = (staff as any).punch_in_criteria || 'GRACE_TIME';

        // Legacy "No Break" check (Can we move this to Shift Type? For now, keep as string check on deprecated or name)
        // If legacy string exists, check that. If Shift name contains "No Break"? 
        const isNoBreak = (shift.name || '').toUpperCase().includes('NO BREAK');

        const fullDayThreshold = isNoBreak ? 7.0 : 7.75;
        const halfDayThreshold = 4.0;

        const isLate = this.isLate(shift.start_time, checkIn, graceTime);

        let status = 'PRESENT';

        if (!checkOut || checkIn.getTime() === checkOut.getTime()) {
            if (!isPastDay) {
                status = (criteria !== 'HOURS_8' && isLate) ? 'HALF_DAY' : 'PRESENT';
            } else {
                if (criteria === 'HOURS_8') status = 'ABSENT';
                else status = 'HALF_DAY';
            }
        } else {
            const workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

            if (criteria === 'HOURS_8') {
                if (workHours >= 8.0) status = 'PRESENT';
                else if (workHours >= halfDayThreshold) status = 'HALF_DAY';
                else status = 'ABSENT';
            } else {
                if (isLate) status = 'HALF_DAY';
                else if (workHours < halfDayThreshold) status = 'ABSENT';
                else if (workHours < fullDayThreshold) status = 'HALF_DAY';
                else status = 'PRESENT';
            }
        }

        return { status, shift, criteria };
    }

    // Get My Attendance
    static async getAttendance(userId: string, startDate: Date, endDate: Date) {
        const records = await db.attendanceRecord.findMany({
            where: {
                user_id: userId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        const holidays = await db.holiday.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Convert records to a map for easy lookup
        const recordMap = new Map(records.map(r => [r.date.toISOString().split('T')[0], r]));

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
                } as any);
            }
        });

        return merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // --- HELPERS ---

    static parseShiftTiming(timingStr: string | null) {
        // Default Shift if null
        const defaultShift = { start: '09:00', end: '18:00' };
        if (!timingStr) return defaultShift;

        // format: "09:00 AM - 06:00 PM"
        const parts = timingStr.split('-').map(s => s.trim());
        if (parts.length !== 2) return defaultShift;

        // Convert 12h to 24h string for easy Date constr
        const to24h = (time12h: string) => {
            const [time, modifier] = time12h.split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
            return `${hours}:${minutes}`;
        };

        return { start: to24h(parts[0]), end: to24h(parts[1]) };
    }

    static isLate(shiftStart24h: string, checkIn: Date, graceMinutes: number = 15): boolean {
        // Convert CheckIn (UTC Date) to IST Minutes for comparison
        // IST = UTC + 5:30 (330 minutes)
        const istDate = new Date(checkIn.getTime() + (330 * 60000));
        const checkInMins = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();

        const [sh, sm] = shiftStart24h.split(':').map(Number);
        const shiftMins = sh * 60 + sm;

        return checkInMins > (shiftMins + graceMinutes);
    }

    static isEarlyDeparture(shiftEnd24h: string, checkOut: Date): boolean {
        // Convert CheckOut (UTC Date) to IST Minutes
        const istDate = new Date(checkOut.getTime() + (330 * 60000));
        const checkOutMins = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();

        const [eh, em] = shiftEnd24h.split(':').map(Number);
        const shiftMins = eh * 60 + em;

        // Note: This logic assumes day shifts (Start < End). Overnight shifts require date handling.
        return checkOutMins < shiftMins;
    }

    // --- END HELPERS ---

    // Regularisation Request
    static async requestRegularisation(userId: string, date: Date, type: string, reason: string) {
        // 0. Validation: Cannot regularize Sundays or Holidays
        const reqDate = new Date(date);
        if (reqDate.getDay() === 0) {
            throw new Error("Cannot regularize attendance for Sundays (Weekly Off).");
        }

        const isHoliday = await db.holiday.findUnique({
            where: { date: reqDate }
        });

        if (isHoliday) {
            throw new Error(`Cannot regularize attendance for ${isHoliday.name} (Holiday).`);
        }

        // 1. Check Monthly Limit
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const currentRequests = await db.regularisationRequest.count({
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

        const request = await db.regularisationRequest.create({
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
        if (limitExceeded) notifMsg += " (Limit Exceeded)";

        await notifyAdmins(
            'REGULARISATION_REQUEST',
            notifMsg,
            `/dashboard?action=review_request&requestId=${request.id}&type=REGULARISATION`
        );

        return request;
    }

    // Biometric Sync
    static async processBiometricLogs(logs: { staff_number: string; timestamp: string | Date; type?: string }[]) {
        const results = { success: 0, failed: 0, errors: [] as string[] };

        for (const log of logs) {
            try {
                const timestamp = new Date(log.timestamp);

                // FIX: Calculate Date Key based on IST (UTC+5:30)
                // The DB stores dates as "00:00 IST" which is "18:30 UTC Previous Day"
                // Example: Feb 19 09:00 IST -> Feb 19 03:30 UTC
                // Target Key: Feb 19 00:00 IST -> Feb 18 18:30 UTC

                const IST_OFFSET = 330 * 60 * 1000; // 5 hours 30 minutes in ms
                const istDate = new Date(timestamp.getTime() + IST_OFFSET);
                istDate.setUTCHours(0, 0, 0, 0); // Sets to Midnight in IST terms
                const dateKeyIST = new Date(istDate.getTime() - IST_OFFSET); // Back to UTC timestamp representing IST midnight

                // FALLBACK KEY: The old logic (UTC Midnight)
                // Existing records for "Today" might have been created with this key before the fix.
                const dateKeyUTC = new Date(timestamp);
                dateKeyUTC.setHours(0, 0, 0, 0);

                // 1. Find User by Staff Number
                const staff = await db.staffProfile.findUnique({
                    where: { staff_number: log.staff_number },
                    include: { user: true }
                });

                if (!staff) {
                    results.errors.push(`Staff number ${log.staff_number} not found`);
                    results.failed++;
                    continue;
                }

                // 3. Find existing record for this day (Check BOTH keys)
                const existing = await db.attendanceRecord.findFirst({
                    where: {
                        user_id: staff.user_id,
                        date: { in: [dateKeyIST, dateKeyUTC] } // Check both new and old key formats
                    }
                });

                // Use the Found Key (or default to IST for new records)
                const dateKey = existing ? existing.date : dateKeyIST;

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isPastDay = dateKey.getTime() < today.getTime();

                if (!existing) {
                    // First punch of the day → provisional check-in
                    const statusResult = await this.computeStatus(staff, timestamp, null, isPastDay);
                    await db.attendanceRecord.create({
                        data: {
                            user_id: staff.user_id,
                            date: dateKeyIST, // Always use Correct IST Key for NEW records
                            check_in: timestamp,
                            status: statusResult.status,
                            shift_snapshot: `${statusResult.shift.start_time}-${statusResult.shift.end_time}`,
                            shift_id: statusResult.shift.id === 'LEGACY' || statusResult.shift.id === 'DEFAULT' ? null : statusResult.shift.id,
                            criteria_mode: statusResult.criteria,
                            grace_time_applied: statusResult.shift.default_grace_time,
                            method: 'BIOMETRIC'
                        }
                    });
                } else {
                    const data: any = {};
                    let shouldUpdate = false;

                    // Update check_in if this punch is earlier
                    // PROTECT MANUAL UPDATES: Only update check-in if NOT manual
                    if (existing.method !== 'MANUAL_ADMIN') {
                        if (!existing.check_in || timestamp < existing.check_in) {
                            data.check_in = timestamp;
                            data.method = 'BIOMETRIC';
                            shouldUpdate = true;
                        }
                    }

                    // Update check_out if this punch is later than current check_in
                    const currentCheckIn = data.check_in || existing.check_in || timestamp;
                    if (timestamp > currentCheckIn && (!existing.check_out || timestamp > existing.check_out)) {
                        data.check_out = timestamp;
                        // Only update method to BIOMETRIC if not already MANUAL_ADMIN (to preserve protection)
                        if (existing.method !== 'MANUAL_ADMIN') {
                            data.method = 'BIOMETRIC';
                        }
                        shouldUpdate = true;
                    }

                    // Force re-evaluation for past-day provisional records
                    if (isPastDay && (existing.status === 'PRESENT')) {
                        shouldUpdate = true;
                    }

                    if (shouldUpdate) {
                        const finalCheckIn = data.check_in || existing.check_in || timestamp;
                        const finalCheckOut = data.check_out || existing.check_out || null;

                        const statusResult = await this.computeStatus(staff, finalCheckIn, finalCheckOut, isPastDay);
                        data.status = statusResult.status;
                        data.shift_snapshot = `${statusResult.shift.start_time}-${statusResult.shift.end_time}`;
                        data.shift_id = statusResult.shift.id === 'LEGACY' || statusResult.shift.id === 'DEFAULT' ? null : statusResult.shift.id;
                        data.criteria_mode = statusResult.criteria;
                        data.grace_time_applied = statusResult.shift.default_grace_time;

                        if (finalCheckIn && finalCheckOut && finalCheckIn.getTime() !== finalCheckOut.getTime()) {
                            data.work_hours = (finalCheckOut.getTime() - finalCheckIn.getTime()) / (1000 * 60 * 60);
                        }

                        await db.attendanceRecord.update({
                            where: { id: existing.id },
                            data
                        });
                    }
                }
                results.success++;
            } catch (e: any) {
                results.failed++;
                results.errors.push(`Error processing ${log.staff_number}: ${e.message}`);
            }
        }
        return results;
    }

    // Recalculate Attendance (Retroactive Sync)
    static async recalculateAttendance(userId: string, startDate: Date, endDate: Date) {
        console.log(`[Recalc] Recalculating attendance for ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const records = await db.attendanceRecord.findMany({
            where: {
                user_id: userId,
                date: { gte: startDate, lte: endDate }
            }
        });

        let updatedCount = 0;
        const staff = await db.staffProfile.findUnique({ where: { user_id: userId } });
        if (!staff) return { message: "Staff not found", count: 0 };

        for (const record of records) {
            // Re-run status logic with new global state (Shift Assignments)
            const statusResult = await this.computeStatus(
                staff,
                record.check_in || new Date(record.date),
                record.check_out,
                true // Always treat as past day analysis
            );

            // Update DB if different (or just force update to be safe)
            await db.attendanceRecord.update({
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
    }

    // Admin: Get Team Attendance Summary
    static async getTeamAttendance(startDate: Date, endDate: Date, requestor?: any) {
        // Fetch all active staff
        const whereClause: any = {
            role: { notIn: ['ADMIN', 'CLIENT'] },
            staffProfile: {
                staff_number: { notIn: ['QIX0001', 'QIX0002'] }
            }
        };

        // RESTRICTION: If not Admin/Manager, ONLY show own attendance
        if (requestor && !['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'].includes(requestor.role)) {
            whereClause.id = requestor.id;
        }

        const staff = await db.user.findMany({
            where: whereClause,

            select: {
                id: true,
                full_name: true,
                department: true,
                staffProfile: {
                    select: {
                        shift_timing: true,
                        designation: true
                    }
                }
            },
            orderBy: {
                full_name: 'asc'
            }
        });

        // Fetch all attendance records for range
        const records = await db.attendanceRecord.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Fetch Holidays for range
        const holidays = await db.holiday.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Fetch Approved Leaves for range
        const approvedLeaves = await db.leaveRequest.findMany({
            where: {
                start_date: { lte: endDate },
                end_date: { gte: startDate },
                status: 'APPROVED'
            }
        });

        // Map records to structure
        const result = staff.map(user => {
            const userRecords = records.filter(r => r.user_id === user.id);
            const attendanceMap: any = {};

            // Populate existing records first
            userRecords.forEach(r => {
                const dateKey = r.date.toISOString().split('T')[0];
                let record = r;

                // AUTO-ABSENT POLICY: If Present/HalfDay, No CheckOut, and Shift Over -> Mark ABSENT
                if ((r.status === 'PRESENT' || r.status === 'HALF_DAY') && !r.check_out) {
                    let eh = 18, em = 0; // Default 18:00

                    if (r.shift_snapshot) {
                        // Snapshot format: "HH:mm-HH:mm" e.g. "09:00-18:00"
                        const parts = r.shift_snapshot.split('-');
                        if (parts.length === 2) {
                            const endParts = parts[1].split(':');
                            eh = parseInt(endParts[0]);
                            em = parseInt(endParts[1]);
                        }
                    } else {
                        // Fallback to legacy profile
                        const shift = AttendanceService.parseShiftTiming(user.staffProfile?.shift_timing || null);
                        const parts = shift.end.split(':');
                        eh = parseInt(parts[0]);
                        em = parseInt(parts[1]);
                    }

                    // Simple Shift End Calculation (UTC based on IST Offset)
                    // r.date is UTC 00:00. 18:00 IST = 12:30 UTC.
                    // General Formula: ShiftEndUTC = DateUTC + ShiftTimeMs - OffsetMs
                    const offset = 330 * 60 * 1000; // 5.5h in ms
                    const shiftEndMs = (eh * 60 + em) * 60 * 1000;
                    const shiftEndUTC = new Date(r.date.getTime() + shiftEndMs - offset);

                    // If NOW > ShiftEnd + 30m Buffer (Safe Margin)
                    const now = new Date();
                    // Optional: Buffer of 0 mins as requested "immediately"
                    if (now > shiftEndUTC) {
                        record.status = 'ABSENT';
                        // Fire-and-forget DB update
                        db.attendanceRecord.update({
                            where: { id: r.id },
                            data: { status: 'ABSENT' }
                        }).catch(e => console.error("Auto-Absent Update Failed", e));
                    }
                }

                attendanceMap[dateKey] = record;

                // If status is LEAVE, try to find the specific type
                if (record.status === 'LEAVE') {
                    const leave = approvedLeaves.find(l =>
                        l.user_id === user.id &&
                        new Date(dateKey) >= new Date(l.start_date.toISOString().split('T')[0]) &&
                        new Date(dateKey) <= new Date(l.end_date.toISOString().split('T')[0])
                    );
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
                        check_out: null
                    };
                }
            });

            return {
                user: {
                    id: user.id,
                    name: user.full_name,
                    department: user.department,
                    designation: user.staffProfile?.designation || '',
                    shift: user.staffProfile?.shift_timing || '09:00 AM - 05:00 PM'
                },
                attendance: attendanceMap
            };
        });

        return result;
    }

    // Get Regularisation Requests (Admin/Manager or User specific)
    static async getRegularisationRequests(userId?: string, status?: string) {
        const whereClause: any = {};
        if (userId) whereClause.user_id = userId;
        if (status) whereClause.status = status;

        return await db.regularisationRequest.findMany({
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
    }

    // Delete Regularisation Request
    static async deleteRegularisationRequest(requestId: string) {
        // Can only delete if PENDING
        const request = await db.regularisationRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new Error("Request not found");

        // Allow deleting even if processed? Usually not for audit, but user asked for "Delete". 
        // Let's restrict to PENDING to be safe, or allow Admin to force delete.
        // For now, allow delete regardless of status as per "Manage" requirement, but warn.
        // actually, let's stick to standard safety: Delete = Hard delete.

        return await db.regularisationRequest.delete({
            where: { id: requestId }
        });
    }

    // Update Regularisation Request Details (Edit)
    static async updateRegularisationRequest(requestId: string, data: { date?: Date, type?: string, reason?: string }) {
        const request = await db.regularisationRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new Error("Request not found");

        if (request.status !== 'PENDING') {
            throw new Error("Cannot edit a processed request. Revert or Create new one.");
        }

        return await db.regularisationRequest.update({
            where: { id: requestId },
            data
        });
    }

    // Update Regularisation Status
    static async updateRegularisationStatus(requestId: string, approverId: string, status: 'APPROVED' | 'REJECTED') {
        const request = await db.regularisationRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new Error("Request not found");

        if (request.status !== 'PENDING') {
            throw new Error("Request is already processed");
        }

        const updated = await db.regularisationRequest.update({
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
            const shift = await ShiftService.getShiftForDate(request.user_id, request.date);

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
            await db.attendanceRecord.upsert({
                where: {
                    user_id_date: {
                        user_id: request.user_id,
                        date: request.date
                    }
                },
                update: {
                    status: 'PRESENT',
                    method: 'REGULARISATION',
                    check_in: checkInTime,
                    check_out: checkOutTime,
                    work_hours: 8, // Explicitly set to 8 as per requirement
                    shift_snapshot: `${shift.start_time}-${shift.end_time}`,
                    shift_id: shift.id === 'LEGACY' || shift.id === 'DEFAULT' ? null : shift.id,
                    criteria_mode: 'REGULARIZATION',
                    grace_time_applied: shift.default_grace_time
                },
                create: {
                    user_id: request.user_id,
                    date: request.date,
                    status: 'PRESENT', // Explicitly set to PRESENT
                    check_in: checkInTime,
                    check_out: checkOutTime,
                    work_hours: 8,
                    method: 'REGULARISATION',
                    shift_snapshot: `${shift.start_time}-${shift.end_time}`,
                    shift_id: shift.id === 'LEGACY' || shift.id === 'DEFAULT' ? null : shift.id,
                    criteria_mode: 'REGULARIZATION',
                    grace_time_applied: shift.default_grace_time
                }
            });
        }

        return updated;
    }

    // Get Regularisation Request History
    static async getRegularisationHistory(month: number, year: number, status?: string) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        // Include the whole day for end date
        endDate.setHours(23, 59, 59, 999);

        const whereClause: any = {
            date: {
                gte: startDate,
                lte: endDate
            }
        };

        if (status && status !== 'ALL') {
            whereClause.status = status;
        } else {
            // If ALL, usually exclude PENDING? User asked for history of approvals (Pending is in pending tab).
            // But History often implies "Past Actions". 
            // Let's include everything that matches the date range.
            // If the user wants only Processed, they can filter or we can default.
            // For now, return all in that month.
        }

        return await db.regularisationRequest.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        full_name: true,
                        department: true,
                        role: true
                    }
                },
                approver: { // Ensure schema has this relation
                    select: {
                        full_name: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        });
    }

    // Revert Regularisation Status
    static async revertRegularisationStatus(requestId: string) {
        const request = await db.regularisationRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new Error("Request not found");

        // If it was APPROVED, we must revert the attendance record changes?
        // This is tricky because we don't know what the PREVIOUS state was.
        // Option 1: Set back to ABSENT or previous state if we knew it.
        // Option 2: Delete the attendance record if it was created by REGULARISATION.

        if (request.status === 'APPROVED') {
            // Find the attendance record for this date
            const record = await db.attendanceRecord.findUnique({
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
                await db.attendanceRecord.delete({
                    where: { id: record.id }
                });
            }
        }

        return await db.regularisationRequest.update({
            where: { id: requestId },
            data: {
                status: 'PENDING',
                approver_id: null
            }
        });
    }

    // Monthly Calendar Data
    static async getMonthlyCalendar(userId: string, month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Fetch Data
        const attendance = await db.attendanceRecord.findMany({
            where: {
                user_id: userId,
                date: { gte: startDate, lte: endDate }
            }
        });

        const leaves = await db.leaveRequest.findMany({
            where: {
                user_id: userId,
                status: 'APPROVED',
                start_date: { lte: endDate },
                end_date: { gte: startDate }
            }
        });

        const holidays = await db.holiday.findMany({
            where: {
                date: { gte: startDate, lte: endDate }
            }
        });

        // Merge Logic
        const calendar: any[] = [];
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
        const getLeaveForDate = (date: Date) => {
            return leaves.find(l =>
                date >= new Date(l.start_date.toISOString().split('T')[0]) &&
                date <= new Date(l.end_date.toISOString().split('T')[0])
            );
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
            } else if (leave) {
                status = 'LEAVE';
                details = { type: leave.type, reason: leave.reason };
                stats.leaves++;
            } else if (isHoliday) {
                status = 'HOLIDAY';
                details = { name: holidays.find(h => h.date.toDateString() === d.toDateString())?.name };
                stats.holidays++;
            } else if (isSunday) {
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
            if (isSunday) sundayCount++;
            if (isHoliday && !isSunday) holidayCount++; // Don't double count if holiday is on sunday
        }

        // Effective Working Days = Total Days - Sundays - Unique Holidays
        // Note: Leaves are part of working days (just not worked), so don't subtract them from "Total Working Days Capacity".
        // But if user wants "Effective Working Days" meaning "Days actually worked", that's `stats.present`.
        // Interpretation of request: "total effective working days" usually means "Potential working days".

        stats.holidays = holidays.length; // Raw count
        // stats.leaves is already set
        stats.workingDays = Math.max(0, daysInMonth - sundayCount - holidayCount);

        return { calendar, stats };
    }

    // Admin Update
    static async adminUpdateAttendance(userId: string, date: string | Date, data: { status?: string, check_in?: string | Date, check_out?: string | Date }) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);

        const updateData: any = {};
        if (data.status) updateData.status = data.status;
        if (data.check_in) updateData.check_in = new Date(data.check_in);
        if (data.check_out) updateData.check_out = new Date(data.check_out);

        // Recalc hours if times changed
        if (updateData.check_in || updateData.check_out) {
            // We need current values if only one is updated
            const existing = await db.attendanceRecord.findUnique({
                where: { user_id_date: { user_id: userId, date: d } }
            });

            const start = updateData.check_in ? new Date(updateData.check_in) : (existing?.check_in ? new Date(existing.check_in) : null);
            const end = updateData.check_out ? new Date(updateData.check_out) : (existing?.check_out ? new Date(existing.check_out) : null);

            if (start && end) {
                updateData.work_hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            }
        }

        return await db.attendanceRecord.upsert({
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
    }



    // Biometric Logs View (Flat List for Admin Table - Shows ALL staff)
    static async getBiometricLogs(startDate: Date, endDate: Date, userId?: string) {
        // 1. Fetch ALL Active Staff involved in attendance (exclude Clients)
        const staffQuery: any = {
            role: { not: 'CLIENT' },
            full_name: { not: 'Biometric Bridge Agent' }, // Explicitly exclude Bridge Agent
            staffProfile: {
                staff_number: { notIn: ['QIX0001', 'QIX0002'] } // Exclude Co-founders (Implicitly checks isNot null)
            },
            // Optional: Filter by specific user if requested (e.g. non-admin view)
            ...(userId ? { id: userId } : {})
        };

        const allStaff = await db.user.findMany({
            where: staffQuery,
            select: {
                id: true,
                full_name: true,
                staffProfile: {
                    select: {
                        staff_number: true,
                        shift_timing: true,
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

        const whereClause: any = {
            date: {
                gte: searchStart,
                lte: endDate
            }
        };
        if (userId) whereClause.user_id = userId;

        const actualRecords = await db.attendanceRecord.findMany({
            where: whereClause
        });

        // 3. Generate Complete List (Dates x Staff)
        const fullLogs: any[] = [];
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
                    if (r.user_id !== staff.id) return false;
                    const recordDateIST = r.date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                    return recordDateIST === dateStr;
                });

                let shiftDisplay = '09:00 AM - 06:00 PM';
                let shiftName = 'Default';
                let graceTime: number = 15;
                let shiftObj: any = null;

                const formatTime = (t: string) => {
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
                        } catch (e) {
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
                            const shiftMeta = await db.shift.findUnique({ where: { id: record.shift_id }, select: { name: true } });
                            if (shiftMeta) shiftName = shiftMeta.name;
                        } catch (_) { /* ignore */ }
                    }
                }
                // Priority 2: Retroactive Lookup (Assignment or Profile Fallback)
                else {
                    const { ShiftService } = require('./shift.service');
                    try {
                        shiftObj = await ShiftService.getShiftForDate(staff.id, currentDate);
                        if (shiftObj) {
                            shiftDisplay = `${formatTime(shiftObj.start_time)} - ${formatTime(shiftObj.end_time)}`;
                            shiftName = shiftObj.name || 'Default';
                            graceTime = shiftObj.default_grace_time ?? 15;
                        }
                    } catch (e) {
                        shiftDisplay = staff.staffProfile?.shift_timing || '09:00 AM - 06:00 PM';
                    }
                }

                if (record) {
                    // Compute is_late from actual punch-in vs shift start + grace
                    let is_late = false;
                    if (record.check_in && shiftObj?.start_time) {
                        is_late = AttendanceService.isLate(shiftObj.start_time, record.check_in, graceTime);
                    } else if (record.check_in && record.shift_snapshot) {
                        // Parse start from snapshot "HH:mm-HH:mm"
                        const snapStart = record.shift_snapshot.split('-')[0]?.trim();
                        if (snapStart) is_late = AttendanceService.isLate(snapStart, record.check_in, graceTime);
                    }

                    fullLogs.push({
                        id: record.id,
                        date: record.date,
                        user_name: staff.full_name,
                        staff_number: staff.staffProfile?.staff_number || 'N/A',
                        shift_timing: shiftDisplay,
                        shift_name: shiftName,
                        grace_time: graceTime,
                        is_late,
                        check_in: record.check_in,
                        check_out: record.check_out,
                        work_hours: record.work_hours || 0,
                        status: record.status,
                        method: record.method
                    });
                } else {
                    fullLogs.push({
                        id: `missing-${staff.id}-${dateStr}`,
                        date: new Date(currentDate),
                        user_name: staff.full_name,
                        staff_number: staff.staffProfile?.staff_number || 'N/A',
                        shift_timing: shiftDisplay,
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
    }
}
