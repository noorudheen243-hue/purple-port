
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listIncompleteRecords() {
    console.log("Searching for Incomplete Attendance Records (Feb 19)...");

    // Targets: Date Key = Feb 19 00:00 UTC OR Feb 18 18:30 UTC
    // We want to find anyone who Checked In but is NOT Checked Out

    // Key 1: Feb 18 18:30 UTC (IST Midnight)
    const dateKeyIST = new Date('2026-02-18T18:30:00.000Z');

    // Key 2: Feb 19 00:00 UTC (Old Logic)
    const dateKeyUTC = new Date('2026-02-19T00:00:00.000Z');

    const records = await prisma.attendanceRecord.findMany({
        where: {
            date: { in: [dateKeyIST, dateKeyUTC] },
            check_in: { not: null },
            check_out: null
        },
        include: {
            user: { select: { full_name: true, staffProfile: { select: { staff_number: true } } } }
        }
    });

    console.log(`Found ${records.length} incomplete records.`);

    records.forEach(r => {
        console.log(`- ${r.user.full_name} (${r.user.staffProfile?.staff_number}) | In: ${r.check_in?.toISOString()} | DateKey: ${r.date.toISOString()}`);
    });
}

listIncompleteRecords()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
