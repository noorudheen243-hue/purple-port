
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugAttendanceStats() {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        console.log('--- DEBUG INFO ---');
        console.log('Today Start:', todayStart.toISOString());
        console.log('Today End:  ', todayEnd.toISOString());

        // 1. Get Today's Attendance Records
        const attendanceRecords = await prisma.attendanceRecord.findMany({
            where: {
                date: {
                    gte: todayStart,
                    lte: todayEnd
                },
                status: { in: ['PRESENT', 'WFH', 'HALF_DAY', 'LATE'] },
                check_in: { not: null }, // STRICT FILTER
                // Exclude Co-Founders
                user: {
                    staffProfile: {
                        staff_number: { notIn: ['QIX0001', 'QIX0002'] }
                    }
                }
            },
            include: {
                user: {
                    select: { full_name: true, department: true }
                }
            }
        });

        console.log(`Found ${attendanceRecords.length} records.`);

        attendanceRecords.forEach(r => {
            console.log(`- ${r.user.full_name} (${r.user.department}): ${r.status} | CheckIn: ${r.check_in}`);
        });

        // Test without CheckIn filter
        const allRecords = await prisma.attendanceRecord.findMany({
            where: {
                date: {
                    gte: todayStart,
                    lte: todayEnd
                },
                status: { in: ['PRESENT', 'WFH', 'HALF_DAY'] }
            }
        });
        console.log(`Total Records (ignoring check_in null): ${allRecords.length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugAttendanceStats();
