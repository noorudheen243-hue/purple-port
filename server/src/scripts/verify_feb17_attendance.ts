
import { PrismaClient } from '@prisma/client';
import { AttendanceService } from '../modules/attendance/service';

const prisma = new PrismaClient();

async function verifyAttendance() {
    console.log("Running detailed discrepancy check for Feb 17...");

    const targetDate = new Date('2026-02-16T18:30:00.000Z'); // Feb 17 IST

    const records = await prisma.attendanceRecord.findMany({
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
        if (!staff) continue;

        const shift = AttendanceService.parseShiftTiming(staff.shift_timing);
        const graceTime = staff.grace_time || 15;
        // criteria logic from service
        const criteria = (staff as any).punch_in_criteria || 'GRACE_TIME';

        // CheckIn Analysis
        const checkIn = r.check_in ? new Date(r.check_in) : null;
        if (!checkIn) continue;

        const isLate = AttendanceService.isLate(shift.start, checkIn, graceTime);

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

            console.log(
                `${r.user.full_name.padEnd(20)} | ${r.status.padEnd(10)} | ${expectedStatus.padEnd(10)} | ${String(lateMinutes - graceTime).padEnd(10)} | ${reason} (Grace: ${graceTime})`
            );
            mismatchCount++;
        } else if (r.user.full_name.includes('Basil') || r.user.full_name.includes('Nidhin')) {
            // Log target users even if matching (to confirm they are correct)
            console.log(
                `${r.user.full_name.padEnd(20)} | ${r.status.padEnd(10)} | ${expectedStatus.padEnd(10)} | -          | Target User Check (Late: ${isLate})`
            );
        }
    }

    console.log("-".repeat(80));
    console.log(`Found ${mismatchCount} discrepancies where user is LATE but not marked HALF_DAY.`);
}

verifyAttendance()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
