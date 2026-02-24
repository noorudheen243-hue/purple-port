import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debug() {
    const now = new Date();
    const IST_OFFSET = 330 * 60 * 1000;
    const istNow = new Date(now.getTime() + IST_OFFSET);
    istNow.setUTCHours(0, 0, 0, 0);
    const todayStart = new Date(istNow.getTime() - IST_OFFSET); // IST Midnight

    const todayEnd = new Date(todayStart.getTime() + (24 * 60 * 60 * 1000) - 1);

    console.log('Now (UTC):', now.toISOString());
    console.log('Today Start (IST Midnight as UTC):', todayStart.toISOString());
    console.log('Today End (IST End as UTC):', todayEnd.toISOString());

    const records = await prisma.attendanceRecord.findMany({
        where: {
            date: {
                gte: todayStart,
                lte: todayEnd
            }
        },
        include: {
            user: {
                select: {
                    full_name: true,
                    department: true,
                    staffProfile: { select: { staff_number: true } }
                }
            }
        }
    });

    console.log('--- Attendance Records for Today ---');
    console.log('Total Records found:', records.length);
    records.forEach(r => {
        console.log(`User: ${r.user.full_name} (${r.user.staffProfile?.staff_number})`);
        console.log(`  Dept: ${r.user.department}`);
        console.log(`  Status: ${r.status}`);
        console.log(`  Check-in: ${r.check_in}`);
        console.log(`  Date in DB: ${r.date.toISOString()}`);
    });

    // Check with the exact logic from service.ts
    const filteredRecords = records.filter(record =>
        ['PRESENT', 'WFH', 'HALF_DAY'].includes(record.status) &&
        record.check_in !== null &&
        !['9c2c3b09-1a4d-4e9f-a00a-fdcae89806a1', '0f602110-d76e-4f21-8bcf-c71959dd4015'].includes(record.user_id)
    );

    console.log('\n--- Filtered Records (Service Logic) ---');
    console.log('Total Filtered:', filteredRecords.length);

    await prisma.$disconnect();
}

debug();
