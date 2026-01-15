
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTodayGhosts() {
    try {
        console.log('Cleaning Ghost Records for Today...');

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Delete records declared 'PRESENT' but with NO check_in
        const result = await prisma.attendanceRecord.deleteMany({
            where: {
                date: {
                    gte: todayStart,
                    lte: todayEnd
                },
                status: 'PRESENT',
                check_in: null
            }
        });

        console.log(`Deleted ${result.count} ghost 'Present' records for today.`);

    } catch (error) {
        console.error('Error cleaning ghosts:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanTodayGhosts();
