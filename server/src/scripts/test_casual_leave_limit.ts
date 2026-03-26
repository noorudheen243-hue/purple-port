import { LeaveService } from '../modules/leave/service';
import db from '../utils/prisma';

async function testCasualLeaveLimit() {
    console.log("🚀 Starting Casual Leave Limit Verification...");

    const testUserEmail = 'basilwork21@gmail.com'; // Adjust if needed
    const user = await db.user.findUnique({ where: { email: testUserEmail } });

    if (!user) {
        console.error("❌ Test user not found");
        return;
    }

    const userId = user.id;
    console.log(`👤 Testing with user: ${user.full_name} (${userId})`);

    // Helper to clean up casual leaves for the test month
    async function cleanup() {
        await db.leaveRequest.deleteMany({
            where: {
                user_id: userId,
                type: 'CASUAL',
                start_date: {
                    gte: new Date(2026, 4, 1), // May 2026
                    lte: new Date(2026, 4, 31)
                }
            }
        });
        console.log("🧹 Cleaned up existing casual records for May 2026");
    }

    try {
        await cleanup();

        // SCENARIO 1: Apply 1 Full Day -> Expected Success
        console.log("\n📝 Scenario 1: Applying for 1 Full Day Casual Leave...");
        await LeaveService.applyLeave(
            userId,
            'CASUAL',
            new Date(2026, 4, 10),
            new Date(2026, 4, 10),
            'Test Success Full Day',
            false
        );
        console.log("✅ Success: Applied first full day.");

        // SCENARIO 2: Apply another Full Day in same month -> Expected Failure
        console.log("\n📝 Scenario 2: Applying for another Full Day (Expected Failure)...");
        try {
            await LeaveService.applyLeave(
                userId,
                'CASUAL',
                new Date(2026, 4, 11),
                new Date(2026, 4, 11),
                'Test Failure Full Day',
                false
            );
            console.error("❌ FAILURE: Should have thrown an error for limit exceeded.");
        } catch (error: any) {
            console.log(`✅ Success: Caught expected error: "${error.message}"`);
        }

        await cleanup();

        // SCENARIO 3: Apply 1 Half Day -> Expected Success
        console.log("\n📝 Scenario 3: Applying for 0.5 Day Casual Leave...");
        await LeaveService.applyLeave(
            userId,
            'CASUAL',
            new Date(2026, 4, 10),
            new Date(2026, 4, 10),
            'Test Success Half Day 1',
            true
        );
        console.log("✅ Success: Applied first half day.");

        // SCENARIO 4: Apply 1 Half Day -> Expected Success (Total = 1.0)
        console.log("\n📝 Scenario 4: Applying for second 0.5 Day (Expected Success)...");
        await LeaveService.applyLeave(
            userId,
            'CASUAL',
            new Date(2026, 4, 11),
            new Date(2026, 4, 11),
            'Test Success Half Day 2',
            true
        );
        console.log("✅ Success: Applied second half day.");

        // SCENARIO 5: Apply 1 Half Day -> Expected Failure (Total would be 1.5)
        console.log("\n📝 Scenario 5: Applying for third 0.5 Day (Expected Failure)...");
        try {
            await LeaveService.applyLeave(
                userId,
                'CASUAL',
                new Date(2026, 4, 12),
                new Date(2026, 4, 12),
                'Test Failure Half Day 3',
                true
            );
            console.error("❌ FAILURE: Should have thrown an error for limit exceeded.");
        } catch (error: any) {
            console.log(`✅ Success: Caught expected error: "${error.message}"`);
        }

        // SCENARIO 6: Apply 1 Full Day after 1.0 used -> Expected Failure
        console.log("\n📝 Scenario 6: Applying for Full Day after 1.0 used (Expected Failure)...");
        try {
            await LeaveService.applyLeave(
                userId,
                'CASUAL',
                new Date(2026, 4, 13),
                new Date(2026, 4, 13),
                'Test Failure Full Day After Half',
                false
            );
            console.error("❌ FAILURE: Should have thrown an error for limit exceeded.");
        } catch (error: any) {
            console.log(`✅ Success: Caught expected error: "${error.message}"`);
        }

    } catch (error) {
        console.error("❌ Unexpected Error during verification:", error);
    } finally {
        await cleanup();
    }

    console.log("\n🏁 Verification Complete.");
}

testCasualLeaveLimit()
    .catch(console.error)
    .finally(() => db.$disconnect());
