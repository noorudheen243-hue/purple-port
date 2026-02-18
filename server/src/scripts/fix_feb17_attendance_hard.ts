
import { PrismaClient } from '@prisma/client';
import { AttendanceService } from '../modules/attendance/service';

const prisma = new PrismaClient();

async function fixAttendanceHard() {
    console.log("Running HARD attendance fix for Feb 17 (Setting Manual Admin)...");

    const targetDate = new Date('2026-02-16T18:30:00.000Z'); // Feb 17 IST

    const records = await prisma.attendanceRecord.findMany({
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
        if (!staff) continue;

        const shift = AttendanceService.parseShiftTiming(staff.shift_timing);
        const graceTime = staff.grace_time || 15;
        const checkIn = r.check_in ? new Date(r.check_in) : null;
        if (!checkIn) continue;

        const isLate = AttendanceService.isLate(shift.start, checkIn, graceTime);

        // Check if we need to update Basil/Nidhin specifically or anyone late
        const isTarget = r.user.full_name.includes('Basil') || r.user.full_name.includes('Nidhin');

        if (isLate && r.status !== 'HALF_DAY') {
            console.log(`Updating ${r.user.full_name}: ${r.status} -> HALF_DAY (Late) [Method: MANUAL_ADMIN]`);
            await prisma.attendanceRecord.update({
                where: { id: r.id },
                data: {
                    status: 'HALF_DAY',
                    method: 'MANUAL_ADMIN' // Lock it!
                }
            });
            updatedCount++;
        } else if (isTarget && r.method !== 'MANUAL_ADMIN') {
            // Even if status is correct, update method to lock it
            console.log(`Locking ${r.user.full_name}: Status is ${r.status}, setting Method -> MANUAL_ADMIN`);
            await prisma.attendanceRecord.update({
                where: { id: r.id },
                data: { method: 'MANUAL_ADMIN' }
            });
            updatedCount++;
        }
    }

    console.log(`Successfully updated/locked ${updatedCount} records.`);
}

fixAttendanceHard()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
