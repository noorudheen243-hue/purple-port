
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeData() {
    try {
        console.log('--- STARTING DATA WIPE ---');

        // 1. Delete Regularisation Requests (Dependent on User, linked to Attendance logic)
        const reg = await prisma.regularisationRequest.deleteMany({});
        console.log(`Deleted ${reg.count} Regularisation Requests.`);

        // 2. Delete Leave Requests
        const leaves = await prisma.leaveRequest.deleteMany({});
        console.log(`Deleted ${leaves.count} Leave Requests.`);

        // 3. Delete Attendance Records
        const att = await prisma.attendanceRecord.deleteMany({});
        console.log(`Deleted ${att.count} Attendance Records.`);

        console.log('--- WIPE COMPLETE ---');
    } catch (error) {
        console.error('Error wiping data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

wipeData();
