
import { PrismaClient } from '@prisma/client';
import { AttendanceService } from '../modules/attendance/service';

const prisma = new PrismaClient();

async function testBiometricSyncIST() {
    console.log("Testing Biometric Sync (IST Logic)...");

    // 1. Setup Test User
    const staffNumber = 'TEST_IST_001';
    let user = await prisma.user.findFirst({ where: { staffProfile: { staff_number: staffNumber } } });

    if (!user) {
        // Create dummy if needed
        user = await prisma.user.create({
            data: {
                email: 'test_ist@example.com',
                full_name: 'Test IST User',
                password_hash: 'dummy',
                role: 'DM_EXECUTIVE',
                department: 'MARKETING',
                staffProfile: {
                    create: {
                        staff_number: staffNumber,
                        designation: 'Tester',
                        department: 'MARKETING',
                        date_of_joining: new Date(),
                        shift_timing: '09:00 AM - 06:00 PM'
                    }
                }
            }
        });
    }

    // 2. Setup Existing Record (Morning Punch) stored as IST Midnight
    // Date: Feb 19 IST Midnight = Feb 18 18:30 UTC
    const istMidnight = new Date('2026-02-18T18:30:00.000Z');

    await prisma.attendanceRecord.deleteMany({
        where: { user_id: user.id, date: istMidnight }
    });

    console.log(`Creating initial record for date: ${istMidnight.toISOString()}`);
    await prisma.attendanceRecord.create({
        data: {
            user_id: user.id,
            date: istMidnight,
            check_in: new Date('2026-02-19T03:30:00.000Z'), // 09:00 IST
            status: 'PRESENT',
            method: 'BIOMETRIC'
        }
    });

    // 3. Simulate Evening Punch Out
    // Feb 19 18:00 IST = Feb 19 12:30 UTC
    const punchOutTime = '2026-02-19T12:30:00.000Z';
    const logs = [{
        staff_number: staffNumber,
        timestamp: punchOutTime
    }];

    console.log(`Processing Punch Out: ${punchOutTime}`);
    const result = await AttendanceService.processBiometricLogs(logs);
    console.log("Sync Result:", JSON.stringify(result));

    // 4. Verify Update
    const record = await prisma.attendanceRecord.findFirst({
        where: { user_id: user.id, date: istMidnight }
    });

    if (record?.check_out) {
        console.log(`SUCCESS: Check out updated! Value: ${record.check_out.toISOString()}`);
    } else {
        console.log(`FAILURE: Check out still null.`);
    }
}

testBiometricSyncIST()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
