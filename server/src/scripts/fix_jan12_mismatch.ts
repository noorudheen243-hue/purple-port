
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixJan12Mismatch() {
    try {
        console.log('Fixing January 12th Date Mismatch...');

        const startJan12 = new Date('2026-01-12T00:00:00.000Z');
        const endJan12 = new Date('2026-01-12T23:59:59.999Z');
        const targetDate = new Date('2026-01-13T00:00:00.000Z'); // Tuesday

        const records = await prisma.attendanceRecord.findMany({
            where: {
                date: {
                    gte: startJan12,
                    lte: endJan12
                }
            }
        });

        console.log(`Checking ${records.length} records...`);

        let updatedCount = 0;

        for (const record of records) {
            if (record.check_in) {
                const checkInDate = new Date(record.check_in);
                // If check_in is on Jan 13th (Day 13), but record date is Jan 12th
                if (checkInDate.getDate() === 13) {
                    await prisma.attendanceRecord.update({
                        where: { id: record.id },
                        data: {
                            date: targetDate
                        }
                    });
                    updatedCount++;
                }
            }
        }

        console.log(`Successfully moved ${updatedCount} records from Jan 12 to Jan 13.`);

    } catch (error) {
        console.error('Error fixing mismatch:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixJan12Mismatch();
