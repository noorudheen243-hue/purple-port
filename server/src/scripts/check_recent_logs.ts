
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentLogs() {
    console.log('Checking recent biometric logs...');

    // Check constraint used in service: method='BIOMETRIC' and updatedAt >= 24h ago
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const count = await prisma.attendanceRecord.count({
        where: {
            updatedAt: { gte: yesterday }
        }
    });

    console.log(`Logs updated in last 24h (ANY METHOD): ${count}`);

    const lastLog = await prisma.attendanceRecord.findFirst({
        orderBy: { updatedAt: 'desc' }
    });

    if (lastLog) {
        console.log('Most Recent Log Updated At:', lastLog.updatedAt);
        console.log('Is Recent?', lastLog.updatedAt >= yesterday);
        console.log('Log Data:', lastLog);
    } else {
        console.log('No biometric logs found at all.');
    }
}

checkRecentLogs()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
