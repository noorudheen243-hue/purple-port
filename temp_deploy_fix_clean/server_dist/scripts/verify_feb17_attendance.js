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
const prisma = new client_1.PrismaClient();
function verifyAttendance() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Running detailed discrepancy check for Feb 17...");
        const targetDate = new Date('2026-02-16T18:30:00.000Z'); // Feb 17 IST
        const records = yield prisma.attendanceRecord.findMany({
            where: { date: targetDate },
            include: {
                user: {
                    include: { staffProfile: true }
                }
            }
        });
        console.log(`Analyzing ${records.length} records.`);
        console.log("User".padEnd(20) + " | " + "Current".padEnd(10) + " | " + "Expected".padEnd(10) + " | " + "LateBy".padEnd(10) + " | " + "Reason");
        console.log("-".repeat(80));
        let mismatchCount = 0;
        for (const r of records) {
            const staff = r.user.staffProfile;
            if (!staff)
                continue;
            const shift = service_1.AttendanceService.parseShiftTiming(staff.shift_timing);
            const graceTime = staff.grace_time || 15;
            // criteria logic from service
            const criteria = staff.punch_in_criteria || 'GRACE_TIME';
            // CheckIn Analysis
            const checkIn = r.check_in ? new Date(r.check_in) : null;
            if (!checkIn)
                continue;
            const isLate = service_1.AttendanceService.isLate(shift.start, checkIn, graceTime);
            // Calculate Expected Status (simplified for "Late" check)
            let expectedStatus = 'PRESENT';
            let reason = "";
            if (isLate) {
                expectedStatus = 'HALF_DAY';
                reason = "Late Arrival";
            }
            // Force PRESENT -> HALF_DAY check only
            // Ignore other complex rules for now, focusing on the User's query about "Late staff"
            if (r.status !== expectedStatus && isLate) {
                // Calculate how late
                const istDate = new Date(checkIn.getTime() + (330 * 60000));
                const checkInMins = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
                const [sh, sm] = shift.start.split(':').map(Number);
                const shiftMins = sh * 60 + sm;
                const lateMinutes = checkInMins - shiftMins; // total minutes past shift start
                console.log(`${r.user.full_name.padEnd(20)} | ${r.status.padEnd(10)} | ${expectedStatus.padEnd(10)} | ${String(lateMinutes - graceTime).padEnd(10)} | ${reason} (Grace: ${graceTime})`);
                mismatchCount++;
            }
            else if (r.user.full_name.includes('Basil') || r.user.full_name.includes('Nidhin')) {
                // Log target users even if matching (to confirm they are correct)
                console.log(`${r.user.full_name.padEnd(20)} | ${r.status.padEnd(10)} | ${expectedStatus.padEnd(10)} | -          | Target User Check (Late: ${isLate})`);
            }
        }
        console.log("-".repeat(80));
        console.log(`Found ${mismatchCount} discrepancies where user is LATE but not marked HALF_DAY.`);
    });
}
verifyAttendance()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
