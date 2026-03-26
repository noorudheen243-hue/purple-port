
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeRegularisation() {
    try {
        console.log('Starting Regularisation Wipe...');

        // 1. Delete Attendance Records marked as 'REGULARISATION'
        // This effectively marks them as Absent (since no record = Absent logic)
        const deletedRecords = await prisma.attendanceRecord.deleteMany({
            where: {
                method: 'REGULARISATION'
            }
        });
        console.log(`Deleted ${deletedRecords.count} Attendance Records created via Regularisation.`);

        // 2. Delete all Regularisation Requests (History)
        const deletedRequests = await prisma.regularisationRequest.deleteMany({});
        console.log(`Deleted ${deletedRequests.count} Regularisation Requests.`);

        console.log('Successfully wiped all regularization history.');
    } catch (error) {
        console.error('Error wiping regularisation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

wipeRegularisation();
