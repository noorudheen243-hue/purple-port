
import { PrismaClient } from '@prisma/client';
import { ShiftService } from '../src/modules/attendance/shift.service';
import { AttendanceService } from '../src/modules/attendance/service';

const prisma = new PrismaClient();

async function runTest() {
    console.log("Starting Shift Logic Test...");

    // 1. Setup Test Data
    const testShift = await prisma.shift.create({
        data: {
            name: "Test Shift",
            start_time: "10:00",
            end_time: "19:00",
            default_grace_time: 15
        }
    });
    console.log("Created Shift:", testShift.id);

    // Create Dummy Staff (User + Profile)
    const email = `test_staff_${Date.now()}@example.com`;
    const user = await prisma.user.create({
        data: {
            email,
            password_hash: "pass",
            full_name: "Test Staff",
            role: "USER",
            department: "QA"
        }
    });
    const staff = await prisma.staffProfile.create({
        data: {
            user_id: user.id,
            staff_number: `T${Date.now()}`,
            designation: "Tester",
            department: "QA",
            date_of_joining: new Date()
        }
    });

    console.log("Created Staff:", staff.id);

    try {
        // 2. Assign Shift with Override
        const today = new Date(); // Normalized in service
        await ShiftService.assignShift({
            staff_id: staff.id,
            shift_id: testShift.id,
            from_date: today,
            to_date: null,
            grace_time: 30
        }); // 30 min grace override
        console.log("Assigned Shift with 30m grace override.");

        // 3. Verify GetShiftForDate
        const activeShift = await ShiftService.getShiftForDate(staff.id, today);
        console.log("Active Shift:", activeShift);

        if (activeShift.id !== testShift.id) throw new Error("Shift ID mismatch");
        if (activeShift.default_grace_time !== 30) throw new Error(`Grace time mismatch. Expected 30, got ${activeShift.default_grace_time}`);

        // 4. Verify ComputeStatus (Late Check)
        // Shift starts 10:00. 
        // 10:10 (Within 15m default, also within 30m override) -> On Time
        // 10:20 (Late for 15m default, but On Time for 30m override) -> On Time (because of override)

        const checkInTime = new Date(today);
        checkInTime.setHours(10, 20, 0, 0); // 10:20 AM

        const status = await AttendanceService.computeStatus(
            { ...staff, id: staff.id } as any,
            checkInTime,
            null,
            false
        );

        console.log("Compute Status Result (10:20 AM check-in):", status);
        // Expect PRESENT if grace is 30m. If grace was 15m, it would be HALF_DAY (assuming late -> half day logic depending on criteria)

        // If 'GRACE_TIME' criteria (default), late = HALF_DAY.
        // But 10:20 is NOT Late for 30m grace (10:00 + 30m = 10:30).
        // So expected status = PRESENT.

        if (status.status !== 'PRESENT') {
            console.error("FAILED: Expected PRESENT, got", status.status);
        } else {
            console.log("PASSED: Status is PRESENT as expected with grace override.");
        }

    } catch (e) {
        console.error("Test Failed:", e);
    } finally {
        // Cleanup
        await prisma.staffShiftAssignment.deleteMany({ where: { staff_id: staff.id } });
        await prisma.staffProfile.delete({ where: { id: staff.id } });
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.shift.delete({ where: { id: testShift.id } });
        await prisma.$disconnect();
    }
}

runTest();
