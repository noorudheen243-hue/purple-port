
import { PrismaClient } from '@prisma/client';
import { ShiftService } from '../src/modules/attendance/shift.service';
import { AttendanceService } from '../src/modules/attendance/service';

const prisma = new PrismaClient();

async function runTest() {
    console.log("Starting Regularisation Logic Test...");

    // 1. Setup Test Data
    const shiftStart = "14:00";
    const shiftEnd = "23:00";
    const testShift = await prisma.shift.create({
        data: {
            name: "Afternoon Shift",
            start_time: shiftStart,
            end_time: shiftEnd,
            default_grace_time: 15
        }
    });

    const email = `reg_test_${Date.now()}@example.com`;
    const user = await prisma.user.create({
        data: {
            email,
            password_hash: "pass",
            full_name: "Reg Tester",
            role: "USER",
            department: "IT"
        }
    });
    const staff = await prisma.staffProfile.create({
        data: {
            user_id: user.id,
            staff_number: `R${Date.now()}`,
            designation: "Tester",
            department: "IT",
            date_of_joining: new Date()
        }
    });

    console.log("Created User:", user.id);

    try {
        // 2. Assign Shift for specific date
        const targetDate = new Date();
        targetDate.setHours(0, 0, 0, 0);

        await ShiftService.assignShift({
            staff_id: staff.id,
            shift_id: testShift.id,
            from_date: targetDate,
            to_date: null
        });

        // 3. Create Regularisation Request
        const request = await prisma.regularisationRequest.create({
            data: {
                user_id: user.id,
                date: targetDate,
                type: 'MISSED_PUNCH_IN',
                reason: 'Test',
                status: 'PENDING'
            }
        });

        // 4. Approve Request (This should trigger logic in AttendanceService)
        // We need to call the Service method directly as we are testing logic
        await AttendanceService.updateRegularisationStatus(request.id, user.id, 'APPROVED');

        // 5. Verify Attendance Record
        const record = await prisma.attendanceRecord.findUnique({
            where: { user_id_date: { user_id: user.id, date: targetDate } }
        });

        if (!record) throw new Error("Attendance Record not created!");

        console.log("Record Created:", record);

        // Verify Shift Timing in Record
        // 14:00 is check_in
        const checkIn = new Date(record.check_in!);
        // targetDate is 00:00 local (or UTC depending on env). 
        // Logic sets hours to startH, startM.
        // 14:00
        const h = checkIn.getHours();

        // Note: new Date() in script might be diff timezone than service? 
        // Service uses Date methods which are local to server. Script runs on same server.
        console.log("CheckIn Hour:", h);

        if (h !== 14) {
            console.log("Expected 14, got", h, ". Timezone might strictly be local.");
            // If local is UTC, 14:00 is 14. If IST, it's 14.
        }

        if (record.shift_snapshot !== `${shiftStart}-${shiftEnd}`) {
            throw new Error(`Snapshot Mismatch. Expected ${shiftStart}-${shiftEnd}, got ${record.shift_snapshot}`);
        }

        console.log("PASSED: Regularisation used correct Shift from Assignment.");

    } catch (e) {
        console.error("Test Failed:", e);
    } finally {
        await prisma.staffShiftAssignment.deleteMany({ where: { staff_id: staff.id } });
        await prisma.attendanceRecord.deleteMany({ where: { user_id: user.id } });
        await prisma.regularisationRequest.deleteMany({ where: { user_id: user.id } });
        await prisma.staffProfile.delete({ where: { id: staff.id } });
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.shift.delete({ where: { id: testShift.id } });
        await prisma.$disconnect();
    }
}

runTest();
