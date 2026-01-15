
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deduplicateAttendance() {
    try {
        console.log('Deduplicating Attendance Records for Today...');

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Fetch all records for today
        const records = await prisma.attendanceRecord.findMany({
            where: {
                date: {
                    gte: todayStart,
                    lte: todayEnd
                }
            },
            orderBy: { createdAt: 'asc' } // Keep the oldest? Or newest? Doesn't matter if identical.
        });

        const seenUsers = new Set<string>();
        const duplicates: string[] = [];

        for (const r of records) {
            if (seenUsers.has(r.user_id)) {
                duplicates.push(r.id);
            } else {
                seenUsers.add(r.user_id);
            }
        }

        console.log(`Found ${duplicates.length} duplicate records.`);

        if (duplicates.length > 0) {
            const result = await prisma.attendanceRecord.deleteMany({
                where: {
                    id: { in: duplicates }
                }
            });
            console.log(`Deleted ${result.count} duplicates.`);
        } else {
            console.log('No duplicates found needing deletion.');
        }

    } catch (error) {
        console.error('Error deduplicating:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deduplicateAttendance();
