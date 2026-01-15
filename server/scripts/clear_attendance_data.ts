
import db from '../src/utils/prisma';

async function clearAttendanceData() {
    try {
        console.log("Starting Attendance Data Cleanup...");

        // 1. Delete all Attendance Records
        const attendance = await db.attendanceRecord.deleteMany({});
        console.log(`✅ Deleted ${attendance.count} attendance records.`);

        // 2. Delete all Regularisation Requests (Since they are tied to attendance corrections)
        const regularisations = await db.regularisationRequest.deleteMany({});
        console.log(`✅ Deleted ${regularisations.count} regularisation requests.`);

        console.log("------------------------------------------------");
        console.log("Attendance history has been completely reset.");

    } catch (error) {
        console.error("❌ Error clearing attendance data:", error);
    } finally {
        await db.$disconnect();
    }
}

clearAttendanceData();
