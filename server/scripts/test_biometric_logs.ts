
import { PrismaClient } from '@prisma/client';
import { AttendanceService } from '../src/modules/attendance/service';

const prisma = new PrismaClient();

async function runTest() {
    console.log("Starting Biometric Logs Test...");

    // 1. Setup Test Data
    const email = `bio_test_${Date.now()}@example.com`;
    // Clean up if previous run failed
    // await prisma.user.deleteMany({ where: { email } });

    const user = await prisma.user.create({
        data: {
            email,
            password_hash: "pass",
            full_name: "Bio Tester",
            role: "USER",
            department: "IT"
        }
    });

    // Need Staff Profile for getBiometricLogs to pick it up
    const staff = await prisma.staffProfile.create({
        data: {
            user_id: user.id,
            staff_number: `B${Date.now()}`,
            designation: "Tester",
            department: "IT",
            date_of_joining: new Date(),
            shift_timing: "09:00 AM - 06:00 PM" // Default Profile Shift (We want to override this)
        }
    });

    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);

    // 2. Create Attendance Record with a SNAPSHOT
    // e.g. Night Shift
    const snapshot = "20:00-05:00";

    await prisma.attendanceRecord.create({
        data: {
            user_id: user.id,
            date: targetDate, // today/midnight
            check_in: new Date(),
            status: 'PRESENT',
            shift_snapshot: snapshot,
            method: 'MANUAL_ADMIN',
            shift_id: 'TEST_SHIFT'
        }
    });

    // 3. Fetch Biometric Logs for TODAY
    const logs = await AttendanceService.getBiometricLogs(targetDate, targetDate, user.id);

    // 4. Verify
    // Find our specific user log
    const myLog = logs.find((l: any) => l.user_name === "Bio Tester" && l.id.startsWith('missing') === false);

    if (!myLog) {
        throw new Error("No log found for Bio Tester");
    }

    console.log("Log Shift Timing:", myLog.shift_timing);
    console.log("Expected Snapshot:", snapshot);

    // Snapshot is "20:00-05:00". service.ts formats it to 12h.
    // 20:00 -> 08:00 PM
    if (myLog.shift_timing.includes("08:00 PM") || myLog.shift_timing.includes("20:00")) {
        console.log("PASSED: Shift Timing reflects snapshot (formatted).");
    } else {
        console.log("FAILED: Shift Timing does not match snapshot expectation.");
        if (myLog.shift_timing === "09:00 AM - 06:00 PM") {
            console.log("FAIL REASON: It fell back to Profile Shift.");
        }
    }

    // Cleanup
    await prisma.attendanceRecord.deleteMany({ where: { user_id: user.id } });
    await prisma.staffProfile.delete({ where: { id: staff.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
}

runTest().catch(console.error);
