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
const client_1 = require("@prisma/client");
const service_1 = require("../modules/attendance/service");
const db = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log("Starting Attendance Status Fix...");
        // Date Range: Today (Local to server running script)
        // We want to fix records for "Today" (2026-02-17)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        console.log(`Fetching records between ${today.toISOString()} and ${tomorrow.toISOString()}`);
        const records = yield db.attendanceRecord.findMany({
            where: {
                date: { gte: today, lt: tomorrow }
            },
            include: { user: { include: { staffProfile: true } } }
        });
        console.log(`Found ${records.length} records.`);
        for (const record of records) {
            const staff = record.user.staffProfile;
            if (!staff)
                continue;
            const checkIn = record.check_in;
            const checkOut = record.check_out;
            const workHours = record.work_hours || 0;
            if (!checkIn) {
                console.log(`Skipping ${record.user.full_name} (No Check-In)`);
                continue;
            }
            // Logic Re-Run
            const shift = service_1.AttendanceService.parseShiftTiming(staff.shift_timing);
            const grace = staff.grace_time || 15;
            const criteria = staff.punch_in_criteria || 'GRACE_TIME';
            // Thresholds
            const isNoBreak = (_a = staff.shift_timing) === null || _a === void 0 ? void 0 : _a.toUpperCase().includes('NO BREAK');
            const fullDayThreshold = isNoBreak ? 7.0 : 7.75;
            const halfDayThreshold = 4.0; // 4 hours for Half Day
            let status = record.status;
            let newStatus = status;
            // Recalc Status
            if (criteria === 'HOURS_8') {
                if (workHours >= 8.0)
                    newStatus = 'PRESENT';
                else if (workHours >= halfDayThreshold)
                    newStatus = 'HALF_DAY';
                else
                    newStatus = 'ABSENT';
            }
            else {
                // Grace Time Mode
                const isLate = service_1.AttendanceService.isLate(shift.start, checkIn, grace);
                // Use isEarlyDeparture only if checked out
                const isEarly = checkOut ? service_1.AttendanceService.isEarlyDeparture(shift.end, checkOut) : false;
                if (workHours >= fullDayThreshold) {
                    if (isLate) {
                        newStatus = 'HALF_DAY'; // Late = Half Day penalty
                    }
                    else {
                        newStatus = 'PRESENT';
                    }
                }
                else if (workHours >= halfDayThreshold) {
                    newStatus = 'HALF_DAY';
                }
                else {
                    newStatus = 'ABSENT';
                }
            }
            if (newStatus !== status) {
                console.log(`Updating ${record.user.full_name} (${criteria}): ${status} -> ${newStatus}`);
                // isLate Debug
                if (criteria !== 'HOURS_8') {
                    const isLate = service_1.AttendanceService.isLate(shift.start, checkIn, grace);
                    console.log(`  Late: ${isLate}, CheckIn: ${checkIn.toISOString()}, Grace: ${grace}`);
                }
                yield db.attendanceRecord.update({
                    where: { id: record.id },
                    data: { status: newStatus }
                });
            }
            else {
                console.log(`No Change ${record.user.full_name} (${newStatus})`);
            }
        }
    });
}
main()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield db.$disconnect();
}));
