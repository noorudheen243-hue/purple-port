
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting data cleanup...');

    try {
        // 1. Delete Notifications
        const deletedNotifications = await prisma.notification.deleteMany({});
        console.log(`Deleted ${deletedNotifications.count} notifications.`);

        // 2. Delete Leave Requests
        const deletedLeaves = await prisma.leaveRequest.deleteMany({});
        console.log(`Deleted ${deletedLeaves.count} leave requests.`);

        // 3. Delete Regularisation Requests
        const deletedRegularisations = await prisma.regularisationRequest.deleteMany({});
        console.log(`Deleted ${deletedRegularisations.count} regularisation requests.`);

        // 4. Delete Attendance Records
        const deletedAttendance = await prisma.attendanceRecord.deleteMany({});
        console.log(`Deleted ${deletedAttendance.count} attendance records.`);

        console.log('Data cleanup completed successfully.');
    } catch (error) {
        console.error('Error clearing data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
