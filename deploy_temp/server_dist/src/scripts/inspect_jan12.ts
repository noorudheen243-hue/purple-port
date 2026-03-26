
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectJan12() {
    try {
        console.log('Inspecting Attendance for Jan 12, 2026...');

        const startJan12 = new Date('2026-01-12T00:00:00.000Z');
        const endJan13 = new Date('2026-01-13T23:59:59.999Z');

        const records = await prisma.attendanceRecord.findMany({
            where: {
                date: {
                    gte: startJan12,
                    lte: endJan13
                }
            },
            include: { user: true },
            orderBy: { date: 'asc' }
        });

        console.log(`Found ${records.length} records for Jan 12-13.`);
        records.forEach(r => {
            console.log(`- Date=${r.date.toISOString().split('T')[0]}, User=${r.user.full_name}, CheckIn=${r.check_in}`);
        });

    } catch (error) {
        console.error('Error inspecting Jan 12:', error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectJan12();
