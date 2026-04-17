import prisma from './src/utils/prisma';
import { calculateAutoLOP } from './src/modules/payroll/service';

async function verifyLOPSimplified() {
    console.log("--- Testing SIMPLIFIED LOP Logic ---");
    
    // 1. Setup Test User
    const testUser = await prisma.user.create({
        data: {
            email: `test_lop_simple_${Date.now()}@example.com`,
            password_hash: 'hashed',
            full_name: 'Test LOP Simplified',
            role: 'MANAGER',
            department: 'MANAGEMENT',
            staffProfile: {
                create: {
                    staff_number: `TLOP_S_${Date.now()}`,
                    designation: 'Tester',
                    department: 'MANAGEMENT',
                    date_of_joining: new Date('2024-01-01')
                }
            }
        }
    });

    const userId = testUser.id;
    const testDate = new Date('2026-03-16'); // Monday

    try {
        // --- SCENARIO 1: APPROVED UNPAID LEAVE ---
        console.log("Scenario 1: APPROVED UNPAID Leave");
        await prisma.leaveRequest.create({
            data: {
                user_id: userId,
                type: 'UNPAID',
                status: 'APPROVED',
                start_date: testDate,
                end_date: testDate,
                reason: 'Unpaid test'
            }
        });
        
        // No attendance record for this day (it's a "missing" day with leave)
        let lop = await calculateAutoLOP(userId, 3, 2026);
        console.log(`  LOP calculated: ${lop} (Expected: 0)`);
        if (lop === 0) console.log("  PASS Scenario 1"); else console.error("  FAIL Scenario 1");

        // --- SCENARIO 2: HALF_DAY WITHOUT LEAVE ---
        console.log("Scenario 2: HALF_DAY (No Leave)");
        const nextDay = new Date(testDate);
        nextDay.setDate(nextDay.getDate() + 1);
        await prisma.attendanceRecord.create({
            data: {
                user_id: userId,
                date: nextDay,
                status: 'HALF_DAY',
                method: 'WEB'
            }
        });

        lop = await calculateAutoLOP(userId, 3, 2026);
        console.log(`  LOP calculated: ${lop} (Expected: 0.5)`);
        if (lop === 0.5) console.log("  PASS Scenario 2"); else console.error("  FAIL Scenario 2");

        // --- SCENARIO 3: ABSENT WITHOUT LEAVE ---
        console.log("Scenario 3: ABSENT (No Leave)");
        const day3 = new Date(nextDay);
        day3.setDate(day3.getDate() + 1);
        await prisma.attendanceRecord.create({
            data: {
                user_id: userId,
                date: day3,
                status: 'ABSENT',
                method: 'WEB'
            }
        });

        lop = await calculateAutoLOP(userId, 3, 2026);
        console.log(`  LOP calculated: ${lop} (Expected: 1.5)`); // 0.5 + 1.0
        if (lop === 1.5) console.log("  PASS Scenario 3"); else console.error("  FAIL Scenario 3");

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

verifyLOPSimplified();
