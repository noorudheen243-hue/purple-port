
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkRecentRecords() {
    console.log("--- Recent Attendance Records Audit (Last 1 Hour) ---\n");

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const records = await db.attendanceRecord.findMany({
        where: { createdAt: { gte: oneHourAgo } },
        include: { user: { select: { full_name: true } } },
        orderBy: { createdAt: 'desc' }
    });

    console.log(`Total Records Found: ${records.length}`);

    records.forEach(r => {
        console.log(`[${r.date.toISOString().split('T')[0]}] User: ${r.user?.full_name || 'Unknown'}, Check In: ${r.check_in?.toISOString() || '-'}, Method: ${r.method}, CreatedAt: ${r.createdAt.toISOString()}`);
    });

    if (records.length === 0) {
        console.log("No new records created in the last hour. This means the sync might have matched existing records or failed silently.");
    }
}

checkRecentRecords()
    .catch(console.error)
    .finally(() => db.$disconnect());
