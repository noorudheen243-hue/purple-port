
import { PrismaClient } from '@prisma/client';
import { AttendanceService } from '../modules/attendance/service';

const prisma = new PrismaClient();

async function fixAttendance() {
    console.log("Running attendance fix for Feb 17...");

    const targetDate = new Date('2026-02-16T18:30:00.000Z'); // Feb 17 IST

    const records = await prisma.attendanceRecord.findMany({
        where: { date: targetDate },
        include: {
            user: {
                include: { staffProfile: true }
            }
        }
    });

    console.log(`Analyzing ${records.length} records for updates...`);

    let updatedCount = 0;

    for (const r of records) {
        const staff = r.user.staffProfile;
        if (!staff) continue;

        const shift = AttendanceService.parseShiftTiming(staff.shift_timing);
        const graceTime = staff.grace_time || 15;

        const checkIn = r.check_in ? new Date(r.check_in) : null;
        if (!checkIn) continue;

        const isLate = AttendanceService.isLate(shift.start, checkIn, graceTime);

        // Calculate Expected Status for Late
        if (isLate && r.status === 'PRESENT') {
            console.log(`Updating ${r.user.full_name}: PRESENT -> HALF_DAY (Late)`);

            await prisma.attendanceRecord.update({
                where: { id: r.id },
                data: { status: 'HALF_DAY' }
            });

            updatedCount++;
        }
    }

    console.log(`Successfully updated ${updatedCount} records.`);
}

fixAttendance()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
