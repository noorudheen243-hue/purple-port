
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of Staff IDs to fix (Irfan and others)
// You can leave this empty to fix ALL incomplete records for today
const TARGET_STAFF_NUMBERS: string[] = [
    'QIX0006', // Salih
    'QIX0009', // Fida
    'QIX0012', // Sajmal
    'QIX0010', // Faris
    'QIX0008', // Sandra
    'QIX0004', // Basil
    'QIX0003', // Nidhin K
    'QIX0011'  // Irfan
];

async function forceUpdateVPS() {
    console.log("=== FORCE UPDATE VPS (Feb 19) ===");
    console.log("Searching for records created with OLD UTC logic OR NEW IST logic...");

    // 1. Define the Date Keys for Feb 19
    const dateKeyIST = new Date('2026-02-18T18:30:00.000Z'); // 00:00 IST
    const dateKeyUTC = new Date('2026-02-19T00:00:00.000Z'); // 00:00 UTC (Old Logic)

    // 2. Find Pending Records
    const records = await prisma.attendanceRecord.findMany({
        where: {
            // Match Correct OR Old Date Key
            date: { in: [dateKeyIST, dateKeyUTC] },
            // Filter for target staff if specified
            user: {
                staffProfile: {
                    staff_number: { in: TARGET_STAFF_NUMBERS }
                }
            },
            // Only fix if Check-Out is MISSING
            check_out: null,
            check_in: { not: null }
        },
        include: {
            user: { include: { staffProfile: true } }
        }
    });

    console.log(`Found ${records.length} incomplete records.`);

    // 3. Update Them
    const checkOutTime = new Date('2026-02-19T12:30:00.000Z'); // 18:00 IST

    for (const r of records) {
        const staff = r.user.staffProfile;
        if (!staff) continue;

        const checkIn = r.check_in!;
        const workMs = checkOutTime.getTime() - checkIn.getTime();
        const workHours = workMs / (1000 * 60 * 60);

        console.log(`Updating ${r.user.full_name} (${staff.staff_number})...`);
        console.log(`  Current In: ${checkIn.toISOString()}`);
        console.log(`  Setting Out: ${checkOutTime.toISOString()} (${workHours.toFixed(2)} hrs)`);

        await prisma.attendanceRecord.update({
            where: { id: r.id },
            data: {
                check_out: checkOutTime,
                status: 'PRESENT',          // Force status
                work_hours: workHours,
                shift_snapshot: '09:00 AM - 06:00 PM', // Default Shift
                method: 'MANUAL_ADMIN'      // Mark as admin fixed
            }
        });
        console.log("  [OK] Updated.");
    }
}

forceUpdateVPS()
    .catch(e => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
