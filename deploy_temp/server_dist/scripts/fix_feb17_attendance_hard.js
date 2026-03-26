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
function fixAttendanceHard() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Running HARD attendance fix for Feb 17 (Setting Manual Admin)...");
        const targetDate = new Date('2026-02-16T18:30:00.000Z'); // Feb 17 IST
        const records = yield prisma.attendanceRecord.findMany({
            where: { date: targetDate },
            include: {
                user: {
                    include: { staffProfile: true }
                }
            }
        });
        let updatedCount = 0;
        for (const r of records) {
            const staff = r.user.staffProfile;
            if (!staff)
                continue;
            const shift = service_1.AttendanceService.parseShiftTiming(staff.shift_timing);
            const graceTime = staff.grace_time || 15;
            const checkIn = r.check_in ? new Date(r.check_in) : null;
            if (!checkIn)
                continue;
            const isLate = service_1.AttendanceService.isLate(shift.start, checkIn, graceTime);
            // Check if we need to update Basil/Nidhin specifically or anyone late
            const isTarget = r.user.full_name.includes('Basil') || r.user.full_name.includes('Nidhin');
            if (isLate && r.status !== 'HALF_DAY') {
                console.log(`Updating ${r.user.full_name}: ${r.status} -> HALF_DAY (Late) [Method: MANUAL_ADMIN]`);
                yield prisma.attendanceRecord.update({
                    where: { id: r.id },
                    data: {
                        status: 'HALF_DAY',
                        method: 'MANUAL_ADMIN' // Lock it!
                    }
                });
                updatedCount++;
            }
            else if (isTarget && r.method !== 'MANUAL_ADMIN') {
                // Even if status is correct, update method to lock it
                console.log(`Locking ${r.user.full_name}: Status is ${r.status}, setting Method -> MANUAL_ADMIN`);
                yield prisma.attendanceRecord.update({
                    where: { id: r.id },
                    data: { method: 'MANUAL_ADMIN' }
                });
                updatedCount++;
            }
        }
        console.log(`Successfully updated/locked ${updatedCount} records.`);
    });
}
fixAttendanceHard()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
