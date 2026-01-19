import db from '../../utils/prisma';

export class AttendanceService {

    // Check In
    static async checkIn(userId: string) {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));

        const existing = await db.attendanceRecord.findUnique({
            where: {
                user_id_date: {
                    user_id: userId,
                    date: startOfDay
                }
            }
        });

        if (existing) {
            throw new Error("Already checked in for today");
        }

        return await db.attendanceRecord.create({
            data: {
                user_id: userId,
                date: startOfDay,
                check_in: new Date(),
                status: 'PRESENT'
            }
        });
    }

    // Check Out
    static async checkOut(userId: string) {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));

        const record = await db.attendanceRecord.findUnique({
            where: {
                user_id_date: {
                    user_id: userId,
                    date: startOfDay
                }
            }
        });

        if (!record) {
            throw new Error("No check-in record found for today");
        }

        if (record.check_out) {
            throw new Error("Already checked out");
        }

        const checkOutTime = new Date();
        const checkInTime = new Date(record.check_in!);
        const durationMs = checkOutTime.getTime() - checkInTime.getTime();
        const workHours = durationMs / (1000 * 60 * 60);

        return await db.attendanceRecord.update({
            where: { id: record.id },
            data: {
                check_out: checkOutTime,
                work_hours: workHours,
                status: workHours < 4 ? 'HALF_DAY' : 'PRESENT' // Example rule
            }
        });
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

    static isLate(shiftStart24h: string, checkIn: Date): boolean {
        // shiftStart24h = "09:00"
        const [sh, sm] = shiftStart24h.split(':').map(Number);

        const shiftDate = new Date(checkIn);
        shiftDate.setHours(sh, sm, 0, 0);

        // Grace Period 15 minutes
        const graceLimit = new Date(shiftDate.getTime() + 15 * 60000);

        return checkIn > graceLimit;
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
                const dateKey = new Date(timestamp);
                dateKey.setHours(0, 0, 0, 0);

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

                // 2. Determine Shift & Rules
                const shift = this.parseShiftTiming(staff.shift_timing); // { start: "09:00", end: "18:00" }

                // 3. Upsert Attendance Record
                const existing = await db.attendanceRecord.findUnique({
                    where: {
                        user_id_date: {
                            user_id: staff.user_id,
                            date: dateKey
                        }
                    }
                });

                if (!existing) {
                    await db.attendanceRecord.create({
                        data: {
                            user_id: staff.user_id,
                            date: dateKey,
                            check_in: timestamp,
                            status: 'PRESENT', // Provisional
                            method: 'BIOMETRIC_SYNC'
                        }
                    });
                } else {
                    const data: any = {};
                    let shouldUpdate = false;

                    if (!existing.check_in || timestamp < existing.check_in) {
                        data.check_in = timestamp;
                        shouldUpdate = true;
                    }

                    if (!existing.check_out || timestamp > existing.check_out) {
                        data.check_out = timestamp;
                        shouldUpdate = true;
                    }

                    if (shouldUpdate) {
                        // Recalculate Status
                        const start = data.check_in || existing.check_in || timestamp;
                        const end = data.check_out || existing.check_out || timestamp;

                        if (start && end && start.getTime() !== end.getTime()) {
                            const durationMs = end.getTime() - start.getTime();
                            const workHours = durationMs / (1000 * 60 * 60);
                            data.work_hours = workHours;

                            const isLate = this.isLate(shift.start, start);
                            const withinGrace = !isLate;

                            if (workHours >= 8) {
                                data.status = 'PRESENT';
                            } else if (workHours >= 4 && workHours < 7.5) {
                                data.status = 'HALF_DAY';
                            } else if (workHours < 4) {
                                data.status = 'ABSENT';
                            }
                        } else {
                            // For now, let's leave status as is (Provisional PRESENT) or update calc.
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
                attendanceMap[dateKey] = r;

                // If status is LEAVE, try to find the specific type
                if (r.status === 'LEAVE') {
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
            // 1. Fetch Staff Profile for Shift Timing
            const staff = await db.staffProfile.findUnique({
                where: { user_id: request.user_id }
            });

            // 2. Calculate Timings
            const shift = this.parseShiftTiming(staff?.shift_timing || null); // { start: "09:00", end: "18:00" }
            const [startH, startM] = shift.start.split(':').map(Number);
            const [endH, endM] = shift.end.split(':').map(Number);

            const checkInTime = new Date(request.date);
            checkInTime.setHours(startH, startM, 0, 0);

            const checkOutTime = new Date(request.date);
            checkOutTime.setHours(endH, endM, 0, 0);

            // Handle overnight shifts if needed (end < start), but assuming day shift for now
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
                    work_hours: 8 // Explicitly set to 8 as per requirement
                },
                create: {
                    user_id: request.user_id,
                    date: request.date,
                    status: 'PRESENT', // Explicitly set to PRESENT
                    check_in: checkInTime,
                    check_out: checkOutTime,
                    work_hours: 8,
                    method: 'REGULARISATION'
                }
            });
        }

        return updated;
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
        // 1. Fetch ALL Active Staff involved in attendance (exclude Clients)
        const staffQuery: any = {
            role: { not: 'CLIENT' },
            full_name: { not: 'Biometric Bridge Agent' }, // Explicitly exclude Bridge Agent
            staffProfile: { isNot: null }, // Only users with Staff Profile (removes N/A staff)
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
                // Skip if staff is inactive? Usually we want to see them if they were active in that period. 
                // For simplicity, showing all currently retrieved staff.

                // Find record
                // Find record
                const record = actualRecords.find(r => {
                    if (r.user_id !== staff.id) return false;

                    const recordDateIST = r.date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

                    // DEBUG LOG (Only print for matches or specific user to avoid spam)
                    if (staff.full_name.includes('Noorudheen')) {
                        console.log(`Debug Check: User ${staff.full_name} | Target ${dateStr} | RecordUTC ${r.date.toISOString()} | RecordIST ${recordDateIST} | Match? ${recordDateIST === dateStr}`);
                    }

                    return recordDateIST === dateStr;
                });

                if (record) {
                    fullLogs.push({
                        id: record.id,
                        date: record.date,
                        user_name: staff.full_name,
                        staff_number: staff.staffProfile?.staff_number || 'N/A',
                        shift_timing: staff.staffProfile?.shift_timing || '09:00 AM - 06:00 PM',
                        check_in: record.check_in,
                        check_out: record.check_out,
                        work_hours: record.work_hours || 0,
                        status: record.status, // PRESENT, LEAVE, etc.
                        method: record.method
                    });
                } else {
                    // Absent / No Punch
                    fullLogs.push({
                        id: `missing-${staff.id}-${dateStr}`,
                        date: currentDate,
                        user_name: staff.full_name,
                        staff_number: staff.staffProfile?.staff_number || 'N/A',
                        shift_timing: staff.staffProfile?.shift_timing || '09:00 AM - 06:00 PM',
                        check_in: null,
                        check_out: null,
                        work_hours: 0,
                        status: 'ABSENT', // Default to ABSENT if no record
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
