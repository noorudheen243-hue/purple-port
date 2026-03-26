
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkFathimaAttendance() {
    console.log("--- Fathima Hasna K Attendance Audit ---\n");

    const staff = await db.staffProfile.findFirst({
        where: { staff_number: 'QIX0013' },
        include: { user: { select: { id: true, full_name: true } } }
    });

    if (!staff || !staff.user) {
        console.log("Staff not found.");
        return;
    }

    const records = await db.attendanceRecord.findMany({
        where: { user_id: staff.user.id },
        orderBy: { date: 'desc' },
        take: 10
    });

    console.log(`Staff: ${staff.user.full_name} (${staff.staff_number})`);
    console.log(`Attendance Records Found: ${records.length}`);

    records.forEach(r => {
        console.log(`[${r.date.toISOString().split('T')[0]}] Check In: ${r.check_in?.toISOString() || '-'}, Method: ${r.method}, Status: ${r.status}`);
    });
}

checkFathimaAttendance()
    .catch(console.error)
    .finally(() => db.$disconnect());
