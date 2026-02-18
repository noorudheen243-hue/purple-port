import { PrismaClient } from '@prisma/client';
import prisma from './src/utils/prisma';
import { AttendanceService } from './src/modules/attendance/service';

// Use imported prisma instance from src/utils/prisma
// const prisma = new PrismaClient();

async function main() {
    const date = new Date('2026-02-17');
    date.setHours(0, 0, 0, 0);

    console.log(`Re-evaluating attendance for ${date.toDateString()}...`);

    const records = await prisma.attendanceRecord.findMany({
        where: { date }
    });

    console.log(`Found ${records.length} records.`);

    for (const record of records) {
        if (!record.check_in) continue;

        const staff = await prisma.staffProfile.findUnique({
            where: { user_id: record.user_id }
        });

        if (!staff) {
            console.log(`User ${record.user_id}: No staff profile found.`);
            continue;
        }

        const shift = AttendanceService.parseShiftTiming(staff.shift_timing);
        const graceTime = staff.grace_time || 15;
        const criteria = (staff as any).punch_in_criteria || 'GRACE_TIME';

        const checkIn = new Date(record.check_in);
        const checkOut = record.check_out ? new Date(record.check_out) : null;

        // Re-use logic from service.ts (abstracting it for this script)
        const isLate = AttendanceService.isLate(shift.start, checkIn, graceTime);
        let newStatus = 'PRESENT';

        if (!checkOut || checkIn.getTime() === checkOut.getTime()) {
            // Past day with single punch
            if (criteria === 'HOURS_8') newStatus = 'ABSENT';
            else newStatus = 'HALF_DAY';
        } else {
            const workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

            if (criteria === 'HOURS_8') {
                if (workHours >= 8.0) newStatus = 'PRESENT';
                else if (workHours >= 4.0) newStatus = 'HALF_DAY';
                else newStatus = 'ABSENT';
            } else {
                if (isLate) newStatus = 'HALF_DAY';
                else if (workHours < 4.0) newStatus = 'ABSENT';
                else if (workHours < 7.75) newStatus = 'HALF_DAY';
                else newStatus = 'PRESENT';
            }
        }

        if (newStatus !== record.status) {
            console.log(`User ${record.user_id}: Status ${record.status} -> ${newStatus} (Check-in: ${checkIn.toLocaleTimeString()}, Criteria: ${criteria}, Late: ${isLate})`);
            await prisma.attendanceRecord.update({
                where: { id: record.id },
                data: { status: newStatus }
            });
        }
    }

    console.log('Done.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
