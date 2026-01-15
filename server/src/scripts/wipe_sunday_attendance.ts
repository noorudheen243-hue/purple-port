
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeSundayAttendance() {
    try {
        console.log('Starting Sunday Attendance Wipe...');

        // Fetch all attendance records
        const allRecords = await prisma.attendanceRecord.findMany({
            select: { id: true, date: true }
        });

        const sundayRecordIds: string[] = [];

        for (const record of allRecords) {
            const date = new Date(record.date);
            if (date.getDay() === 0) { // 0 is Sunday
                sundayRecordIds.push(record.id);
            }
        }

        if (sundayRecordIds.length > 0) {
            const result = await prisma.attendanceRecord.deleteMany({
                where: {
                    id: { in: sundayRecordIds }
                }
            });
            console.log(`Deleted ${result.count} attendance records found on Sundays.`);
        } else {
            console.log('No attendance records found on Sundays.');
        }

        console.log('Successfully wiped Sunday attendance.');
    } catch (error) {
        console.error('Error wiping Sunday attendance:', error);
    } finally {
        await prisma.$disconnect();
    }
}

wipeSundayAttendance();
