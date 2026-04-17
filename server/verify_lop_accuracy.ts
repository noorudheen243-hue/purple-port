import prisma from './src/utils/prisma';
import { calculateAutoLOP } from './src/modules/payroll/service';

async function verifyLOPAccuracy() {
    console.log("--- Testing LOP Accuracy Fixes ---");
    
    // 1. Setup Test User
    const testUser = await prisma.user.create({
        data: {
            email: `test_lop_${Date.now()}@example.com`,
            password_hash: 'hashed',
            full_name: 'Test LOP Accuracy',
            role: 'MANAGER',
            department: 'MANAGEMENT',
            staffProfile: {
                create: {
                    staff_number: `TLOP_${Date.now()}`,
                    designation: 'Tester',
                    department: 'MANAGEMENT',
                    date_of_joining: new Date('2024-01-01')
                }
            }
        }
    });

    const userId = testUser.id;
    const testDate = new Date('2026-03-15'); // A Sunday-less day in Mar 2026

    try {
        // --- SCENARIO A: HALF_DAY + PAID LEAVE ---
        console.log("Scenario A: HALF_DAY + Approved SICK Leave");
        await prisma.attendanceRecord.create({
            data: {
                user_id: userId,
                date: testDate,
                status: 'HALF_DAY',
                method: 'WEB'
            }
        });
        await prisma.leaveRequest.create({
            data: {
                user_id: userId,
                type: 'SICK',
                status: 'APPROVED',
                start_date: testDate,
                end_date: testDate,
                reason: 'Sick test'
            }
        });
        
        let lop = await calculateAutoLOP(userId, 3, 2026);
        console.log(`  LOP calculated: ${lop} (Expected: 0)`);
        if (lop === 0) console.log("  PASS Scenario A"); else console.error("  FAIL Scenario A");

        // --- SCENARIO B: ABSENT + APPROVED REGULARIZATION ---
        console.log("Scenario B: ABSENT + Approved Regularization");
        const nextDay = new Date(testDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        await prisma.attendanceRecord.create({
            data: {
                user_id: userId,
                date: nextDay,
                status: 'ABSENT',
                method: 'WEB'
            }
        });
        await prisma.regularisationRequest.create({
            data: {
                user_id: userId,
                date: nextDay,
                type: 'MISSED_PUNCH_IN',
                reason: 'Forgot to punch',
                status: 'APPROVED'
            }
        });

        lop = await calculateAutoLOP(userId, 3, 2026);
        console.log(`  LOP calculated: ${lop} (Expected: 0)`);
        if (lop === 0) console.log("  PASS Scenario B"); else console.error("  FAIL Scenario B");

    } catch (e) {
        console.error("Test error:", e);
    } finally {
        // Cleanup
        await prisma.attendanceRecord.deleteMany({ where: { user_id: userId } });
        await prisma.leaveRequest.deleteMany({ where: { user_id: userId } });
        await prisma.regularisationRequest.deleteMany({ where: { user_id: userId } });
        await prisma.staffProfile.delete({ where: { user_id: userId } });
        await prisma.user.delete({ where: { id: userId } });
        await prisma.$disconnect();
    }
}

verifyLOPAccuracy();
