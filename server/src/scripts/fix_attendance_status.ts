
import { PrismaClient } from '@prisma/client';
import { AttendanceService } from '../modules/attendance/service';

const db = new PrismaClient();

async function main() {
    console.log("Starting Attendance Status Fix...");

    // Date Range: Today (Local to server running script)
    // We want to fix records for "Today" (2026-02-17)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    console.log(`Fetching records between ${today.toISOString()} and ${tomorrow.toISOString()}`);

    const records = await db.attendanceRecord.findMany({
        where: {
            date: { gte: today, lt: tomorrow }
        },
        include: { user: { include: { staffProfile: true } } }
    });

    console.log(`Found ${records.length} records.`);

    for (const record of records) {
        const staff = record.user.staffProfile;
        if (!staff) continue;

        const checkIn = record.check_in;
        const checkOut = record.check_out;
        const workHours = record.work_hours || 0;

        if (!checkIn) {
            console.log(`Skipping ${record.user.full_name} (No Check-In)`);
            continue;
        }

        // Logic Re-Run
        const shift = AttendanceService.parseShiftTiming(staff.shift_timing);
        const grace = staff.grace_time || 15;
        const criteria = (staff as any).punch_in_criteria || 'GRACE_TIME';

        // Thresholds
        const isNoBreak = staff.shift_timing?.toUpperCase().includes('NO BREAK');
        const fullDayThreshold = isNoBreak ? 7.0 : 7.75;
        const halfDayThreshold = 4.0; // 4 hours for Half Day

        let status = record.status;
        let newStatus = status;

        // Recalc Status
        if (criteria === 'HOURS_8') {
            if (workHours >= 8.0) newStatus = 'PRESENT';
            else if (workHours >= halfDayThreshold) newStatus = 'HALF_DAY';
            else newStatus = 'ABSENT';
        } else {
            // Grace Time Mode
            const isLate = AttendanceService.isLate(shift.start, checkIn, grace);
            // Use isEarlyDeparture only if checked out
            const isEarly = checkOut ? AttendanceService.isEarlyDeparture(shift.end, checkOut) : false;

            if (workHours >= fullDayThreshold) {
                if (isLate) {
                    newStatus = 'HALF_DAY'; // Late = Half Day penalty
                } else {
                    newStatus = 'PRESENT';
                }
            } else if (workHours >= halfDayThreshold) {
                newStatus = 'HALF_DAY';
            } else {
                newStatus = 'ABSENT';
            }
        }

        if (newStatus !== status) {
            console.log(`Updating ${record.user.full_name} (${criteria}): ${status} -> ${newStatus}`);
            // isLate Debug
            if (criteria !== 'HOURS_8') {
                const isLate = AttendanceService.isLate(shift.start, checkIn, grace);
                console.log(`  Late: ${isLate}, CheckIn: ${checkIn.toISOString()}, Grace: ${grace}`);
            }

            await db.attendanceRecord.update({
                where: { id: record.id },
                data: { status: newStatus }
            });
        } else {
            console.log(`No Change ${record.user.full_name} (${newStatus})`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await db.$disconnect();
    });
