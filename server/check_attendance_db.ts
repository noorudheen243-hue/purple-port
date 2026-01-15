import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAttendance() {
    console.log('Checking Attendance Records for Today...');

    // 1. Get Today's Date Range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    console.log(`Querying from ${today.toISOString()} to ${tomorrow.toISOString()}`);

    // 2. Query
    const records = await prisma.attendanceRecord.findMany({
        where: {
            date: {
                gte: today,
                lt: tomorrow
            }
        },
        include: {
            user: {
                select: { full_name: true, staffProfile: { select: { staff_number: true } } }
            }
        }
    });

    console.log(`Found ${records.length} records.`);
    if (records.length === 0) {
        console.log('Use test_sync.ts to generate one?');
    }

    records.forEach(r => {
        console.log(`- [${r.status}] ${r.user.full_name} (${r.user.staffProfile?.staff_number})`);
        console.log(`  Date ISO: ${r.date.toISOString()}`);
        console.log(`  In: ${r.check_in?.toLocaleTimeString()} | Out: ${r.check_out?.toLocaleTimeString()}`);
        console.log(`  Method: ${r.method}`);
    });
}

checkAttendance()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
