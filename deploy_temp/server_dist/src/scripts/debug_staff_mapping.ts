
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function debugMapping() {
    console.log("--- Staff Mapping Debug ---\n");

    // 1. List all Staff Profiles
    const staff = await db.staffProfile.findMany({
        include: { user: { select: { full_name: true, id: true } } }
    });

    console.log(pad("Staff Number", 15) + " | " + pad("User Name", 20) + " | " + pad("User ID", 36));
    console.log("-".repeat(80));
    staff.forEach(s => {
        console.log(
            pad(s.staff_number, 15) + " | " +
            pad(s.user?.full_name || 'Unlinked', 20) + " | " +
            pad(s.user?.id || 'N/A', 36)
        );
    });

    // 2. Dump recent 20 Attendance Records (All methods)
    console.log("\n--- Recent 20 Attendance Records (ANY Date) ---\n");
    const logs = await db.attendanceRecord.findMany({
        take: 20,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { full_name: true } } }
    });

    console.log(pad("Date", 12) + " | " + pad("User", 20) + " | " + pad("Check In", 10) + " | " + pad("Created At", 25));
    console.log("-".repeat(80));
    logs.forEach(l => {
        const d = l.date.toISOString().substr(0, 10);
        const ci = l.check_in ? l.check_in.toISOString().substr(11, 8) : '-';
        console.log(
            pad(d, 12) + " | " +
            pad(l.user?.full_name || 'Unknown', 20) + " | " +
            pad(ci, 10) + " | " +
            pad(l.createdAt.toISOString(), 25)
        );
    });
}

function pad(str: string, len: number) {
    return (str || '').padEnd(len).substring(0, len);
}

debugMapping()
    .catch(console.error)
    .finally(() => db.$disconnect());
