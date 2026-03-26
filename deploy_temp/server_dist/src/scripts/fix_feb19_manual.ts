
import { PrismaClient } from '@prisma/client';
import { AttendanceService } from '../modules/attendance/service';

const prisma = new PrismaClient();

const TARGET_STAFF = [
    'QIX0006', // Salih
    'QIX0009', // Fida
    'QIX0012', // Sajmal
    'QIX0010', // Faris
    'QIX0008', // Sandra
    'QIX0004', // Basil
    'QIX0003', // Nidhin K
    'QIX0011'  // Irfan
];

async function fixFeb19Manual() {
    console.log("Applying Manual Fix for Feb 19 Punch-Outs...");

    // Target Check Out Time: 18:00 IST = 12:30 UTC
    const checkOutTime = new Date('2026-02-19T12:30:00.000Z');

    for (const staffCode of TARGET_STAFF) {
        // 1. Find Staff
        const staff = await prisma.staffProfile.findUnique({
            where: { staff_number: staffCode },
            include: { user: true }
        });

        if (!staff) {
            console.log(`Skipping ${staffCode}: Staff not found.`);
            continue;
        }

        // 2. Find Record for Today (Feb 19)
        // Check both IST and UTC keys to be safe
        const dateKeyIST = new Date('2026-02-18T18:30:00.000Z');
        const dateKeyUTC = new Date('2026-02-19T00:00:00.000Z');

        const record = await prisma.attendanceRecord.findFirst({
            where: {
                user_id: staff.user_id,
                date: { in: [dateKeyIST, dateKeyUTC] }
            }
        });

        if (!record) {
            console.log(`Skipping ${staffCode}: No attendance record found for today.`);
            continue;
        }

        if (!record.check_in) {
            console.log(`Skipping ${staffCode}: No check-in time.`);
            continue;
        }

        console.log(`Fixing ${staff.user.full_name} (${staffCode})...`);

        // 3. Compute Status with new Check Out
        // Using service method to ensure logic consistency (Grace time, Half day, etc.)
        // Note: computeStatus is static/public
        // We need to simulate the "isPastDay" ?? It's today.

        const isPastDay = false; // Feb 19 is today
        const statusResult = await AttendanceService.computeStatus(staff, record.check_in, checkOutTime, isPastDay);

        const workHours = (checkOutTime.getTime() - record.check_in.getTime()) / (1000 * 60 * 60);

        // 4. Update
        await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
                check_out: checkOutTime,
                status: statusResult.status,
                shift_snapshot: `${statusResult.shift.start_time}-${statusResult.shift.end_time}`,
                criteria_mode: statusResult.criteria,
                work_hours: workHours,
                method: 'MANUAL_ADMIN' // Marking as Manual to indicate intervention
            }
        });

        console.log(` -> Updated: Status=${statusResult.status} | Hours=${workHours.toFixed(2)}`);
    }
}

fixFeb19Manual()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
