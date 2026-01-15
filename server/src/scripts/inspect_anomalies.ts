
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectAnomalies() {
    try {
        console.log('Inspecting Anomalies for Today...');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const records = await prisma.attendanceRecord.findMany({
            where: {
                date: {
                    gte: todayStart,
                    lte: todayEnd
                }
            },
            include: {
                user: {
                    select: { full_name: true, department: true, staffProfile: { select: { staff_number: true } } }
                }
            }
        });

        console.log(`Total Records Found: ${records.length}`);
        records.forEach(r => {
            console.log(`User: ${r.user.full_name} (${r.user.staffProfile?.staff_number}) | Status: ${r.status} | CheckIn: ${r.check_in}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectAnomalies();
