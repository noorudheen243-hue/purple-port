
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function verifyLogs() {
    console.log("Verifying Attendance Logs for Feb 19, 2026...");

    // 1. Define Range (UTC)
    // IST: Feb 19 00:00 to Feb 19 23:59
    // UTC: Feb 18 18:30 to Feb 19 18:29
    // However, records are stored with a normalized 'date' (usually midnight).
    // Let's search by the normalized 'date' field first.

    // Normalized Date for Feb 19
    const targetDate = new Date('2026-02-19T00:00:00.000Z');
    // Adjust if your system uses IST local midnight stored as UTC
    // Based on previous context, system tries to store UTC midnight for the day.

    const records = await db.attendanceRecord.findMany({
        where: {
            date: targetDate
        },
        include: {
            user: {
                select: {
                    full_name: true,
                    staffProfile: {
                        select: { staff_number: true }
                    }
                }
            }
        },
        orderBy: {
            user: { full_name: 'asc' }
        }
    });

    console.log(`\nFound ${records.length} records for ${targetDate.toISOString().split('T')[0]}:\n`);
    console.log(pad("Name", 20) + " | " + pad("Staff ID", 10) + " | " + pad("Check In", 12) + " | " + pad("Check Out", 12) + " | " + pad("Status", 10));
    console.log("-".repeat(80));

    for (const r of records) {
        const checkIn = r.check_in ? r.check_in.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '-';
        const checkOut = r.check_out ? r.check_out.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : 'MISSING';

        console.log(
            pad(r.user.full_name, 20) + " | " +
            pad(r.user.staffProfile?.staff_number || '-', 10) + " | " +
            pad(checkIn, 12) + " | " +
            pad(checkOut, 12) + " | " +
            pad(r.status, 10)
        );
    }

    console.log("\nDone.");
}

function pad(str: string, len: number) {
    return (str || '').padEnd(len).substring(0, len);
}

verifyLogs()
    .catch(e => console.error(e))
    .finally(() => db.$disconnect());
