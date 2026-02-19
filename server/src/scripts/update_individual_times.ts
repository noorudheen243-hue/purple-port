
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// === CONFIGURATION ===
// Add the Staff ID and the CORRECT Punch-Out Time (IST) here
// Format: 'YYYY-MM-DD HH:mm:ss' (in IST)
const CORRECTIONS: Record<string, string> = {
    // Example: 'QIX0006': '2026-02-19 18:30:00',
    'QIX0006': '2026-02-19 18:00:00', // Salih
    'QIX0009': '2026-02-19 18:00:00', // Fida
    'QIX0012': '2026-02-19 18:00:00', // Sajmal
    'QIX0010': '2026-02-19 18:00:00', // Faris
    'QIX0008': '2026-02-19 18:00:00', // Sandra
    'QIX0004': '2026-02-19 18:00:00', // Basil
    'QIX0003': '2026-02-19 18:00:00', // Nidhin K
    'QIX0011': '2026-02-19 18:00:00', // Irfan
};
// =====================

async function updateIndividualTimes() {
    console.log("Applying Individual Corrections for Feb 19...");

    // IST Offset = 5:30 = 330 mins
    // To store in DB (UTC), we need to SUBTRACT 5:30 from the input IST string
    // Or easier: Create Date object from string and adjust.

    const dateKeyIST = new Date('2026-02-18T18:30:00.000Z');
    const dateKeyUTC = new Date('2026-02-19T00:00:00.000Z');

    for (const [staffId, timeStr] of Object.entries(CORRECTIONS)) {
        // Parse IST Input: "2026-02-19 18:00:00"
        // We act as if this string is UTC first, then subtract 5.5 hours to get real UTC
        // Setup: '2026-02-19T18:00:00.000Z' minus 5.5 hours

        const targetTimeISO = timeStr.replace(' ', 'T') + '.000Z';
        const naiveDate = new Date(targetTimeISO);

        // Adjust for IST (Subtract 5 hours 30 mins)
        // 18:00 IST -> 12:30 UTC
        const utcDate = new Date(naiveDate.getTime() - (330 * 60 * 1000));

        console.log(`User ${staffId}: Target IST ${timeStr} -> Storing UTC ${utcDate.toISOString()}`);

        // Find Record
        const record = await prisma.attendanceRecord.findFirst({
            where: {
                user: { staffProfile: { staff_number: staffId } },
                date: { in: [dateKeyIST, dateKeyUTC] }
            },
            include: { user: true }
        });

        if (!record) {
            console.warn(`  Record not found for ${staffId}`);
            continue;
        }

        if (!record.check_in) {
            console.warn(`  No check-in for ${staffId}, cannot calculate hours.`);
            continue;
        }

        // Calculate Work Hours
        const workMs = utcDate.getTime() - record.check_in.getTime();
        const workHours = workMs / (1000 * 60 * 60);

        // Update
        await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
                check_out: utcDate,
                work_hours: workHours,
                status: 'PRESENT', // Ensure Present
                method: 'MANUAL_ADMIN'
            }
        });

        console.log(`  [OK] Updated ${record.user.full_name}. Hours: ${workHours.toFixed(2)}`);
    }
}

updateIndividualTimes()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
