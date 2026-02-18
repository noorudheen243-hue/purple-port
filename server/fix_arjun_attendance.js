/**
 * Fix Arjun's attendance data issues:
 * 1. Records where check_in == check_out (single punch) → set check_out = null
 * 2. Records stored on wrong date (timezone shift) → delete the wrong-date copy
 * 
 * Run: node fix_arjun_attendance.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

async function fix() {
    console.log("=== Fix Arjun Attendance Data ===\n");

    const arjun = await prisma.user.findFirst({ where: { full_name: { contains: 'Arjun' } } });
    if (!arjun) { console.log("Arjun not found"); return; }
    console.log(`User: ${arjun.full_name} (${arjun.id})\n`);

    const records = await prisma.attendanceRecord.findMany({
        where: {
            user_id: arjun.id,
            date: { gte: new Date(2026, 1, 1), lte: new Date(2026, 1, 28, 23, 59, 59) }
        },
        orderBy: { date: 'asc' }
    });

    let fixed = 0;

    for (const r of records) {
        const d = new Date(r.date);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        const dateDay = d.getDate();

        // Issue 1: check_in == check_out (same timestamp = single punch)
        if (r.check_in && r.check_out) {
            const inTime = new Date(r.check_in).getTime();
            const outTime = new Date(r.check_out).getTime();
            if (inTime === outTime) {
                console.log(`Day ${dateDay} (${dayName}): check_in == check_out → clearing check_out, keeping HALF_DAY`);
                await prisma.attendanceRecord.update({
                    where: { id: r.id },
                    data: { check_out: null, status: 'HALF_DAY' }
                });
                fixed++;
                continue;
            }

            // Issue 2: check_in date doesn't match the record's date (timezone shift)
            const checkInDate = new Date(r.check_in);
            const checkInDay = checkInDate.getUTCDate(); // UTC day
            // If the check_in UTC date is different from the record date, it's a timezone issue
            // The record date is stored as UTC midnight, check_in is UTC time
            // If check_in is on a DIFFERENT calendar day (UTC) than the record date → wrong date
            const recordDateUTC = new Date(r.date);
            const recordDayUTC = recordDateUTC.getUTCDate();
            const checkInDayUTC = checkInDate.getUTCDate();
            const checkInMonthUTC = checkInDate.getUTCMonth();
            const recordMonthUTC = recordDateUTC.getUTCMonth();

            if (checkInDayUTC !== recordDayUTC || checkInMonthUTC !== recordMonthUTC) {
                console.log(`Day ${dateDay} (${dayName}): check_in is ${checkInDate.toISOString()} but record date is ${r.date.toISOString()} → WRONG DATE, deleting`);
                await prisma.attendanceRecord.delete({ where: { id: r.id } });
                fixed++;
                continue;
            }
        }

        console.log(`Day ${dateDay} (${dayName}): ${r.status} → OK`);
    }

    console.log(`\n✅ Fixed ${fixed} records`);

    // Show final state
    console.log("\n=== Arjun's Final Attendance (Feb 2026) ===");
    const finalRecords = await prisma.attendanceRecord.findMany({
        where: {
            user_id: arjun.id,
            date: { gte: new Date(2026, 1, 1), lte: new Date(2026, 1, 18, 23, 59, 59) }
        },
        orderBy: { date: 'asc' }
    });

    let lopTotal = 0;
    for (const r of finalRecords) {
        const d = new Date(r.date);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        const lop = r.status === 'ABSENT' ? 1 : r.status === 'HALF_DAY' ? 0.5 : 0;
        if (lop > 0) lopTotal += lop;
        console.log(`  Day ${d.getDate()} (${dayName}): ${r.status}${lop > 0 ? ` → +${lop} LOP` : ''}`);
    }

    // Count missing days
    const today = new Date(2026, 1, 18);
    const recordedDates = new Set(finalRecords.map(r => new Date(r.date).toDateString()));
    let missingLOP = 0;
    for (let day = 1; day <= 18; day++) {
        const d = new Date(2026, 1, day);
        if (d.getDay() === 0) continue;
        if (!recordedDates.has(d.toDateString())) {
            console.log(`  Day ${day} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}): MISSING → +1 LOP`);
            missingLOP++;
        }
    }

    console.log(`\n  Explicit LOP: ${lopTotal}`);
    console.log(`  Missing Days LOP: ${missingLOP}`);
    console.log(`  TOTAL LOP: ${lopTotal + missingLOP}`);

    await prisma.$disconnect();
}

fix().catch(e => { console.error("ERROR:", e); prisma.$disconnect(); });
