
import db from '../src/utils/prisma';

async function clearTestLeaves() {
    try {
        // 1. Find the user
        const user = await db.user.findFirst({
            where: {
                full_name: {
                    contains: 'Noorudheen'
                }
            }
        });

        if (!user) {
            console.log("User 'Noorudheen' not found.");
            return;
        }

        console.log(`Found User: ${user.full_name} (${user.id})`);

        // 2. Find Approved Leave Requests
        const leaves = await db.leaveRequest.findMany({
            where: {
                user_id: user.id,
                status: 'APPROVED'
            }
        });

        console.log(`Found ${leaves.length} approved leave requests.`);

        for (const leave of leaves) {
            console.log(`Processing Leave: ${leave.type} from ${leave.start_date.toISOString()} to ${leave.end_date.toISOString()}`);

            // 3. Clear associated Attendance Records
            // We verify it's status 'LEAVE' to avoid accidentally deleting valid attendance if they overlapped (though they shouldn't)
            const result = await db.attendanceRecord.deleteMany({
                where: {
                    user_id: user.id,
                    status: 'LEAVE',
                    date: {
                        gte: leave.start_date,
                        lte: leave.end_date
                    }
                }
            });

            console.log(`  - Deleted ${result.count} attendance records.`);

            // 4. Delete the Leave Request
            await db.leaveRequest.delete({
                where: { id: leave.id }
            });
            console.log(`  - Deleted Leave Request ${leave.id}`);
        }

        console.log("\nDone! All test leaves cleared.");

    } catch (error) {
        console.error("Error clearing leaves:", error);
    } finally {
        await db.$disconnect();
    }
}

clearTestLeaves();
