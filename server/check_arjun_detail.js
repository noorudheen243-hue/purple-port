/**
 * Check Arjun's detailed attendance records for Feb 2026
 * Run: node check_arjun_detail.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

async function check() {
    const arjun = await prisma.user.findFirst({ where: { full_name: { contains: 'Arjun' } } });
    if (!arjun) { console.log("Not found"); return; }

    const records = await prisma.attendanceRecord.findMany({
        where: {
            user_id: arjun.id,
            date: { gte: new Date(2026, 1, 1), lte: new Date(2026, 1, 18, 23, 59, 59) }
        },
        orderBy: { date: 'asc' }
    });

    console.log("Day | DayName | Status     | check_in            | check_out");
    console.log("----+---------+------------+---------------------+--------------------");
    for (const r of records) {
        const d = new Date(r.date);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        console.log(
            `${String(d.getDate()).padStart(3)} | ${dayName.padEnd(7)} | ${r.status.padEnd(10)} | ${r.check_in ? new Date(r.check_in).toISOString() : 'NULL'.padEnd(20)} | ${r.check_out ? new Date(r.check_out).toISOString() : 'NULL'}`
        );
    }

    // Also check which days are missing
    console.log("\n--- Missing Days (no record, not Sunday) ---");
    const today = new Date(2026, 1, 18);
    const recordedDates = new Set(records.map(r => new Date(r.date).toDateString()));
    for (let day = 1; day <= 18; day++) {
        const d = new Date(2026, 1, day);
        if (d.getDay() === 0) continue; // skip Sunday
        if (!recordedDates.has(d.toDateString())) {
            console.log(`  Day ${day} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}): MISSING → +1 LOP`);
        }
    }

    await prisma.$disconnect();
}

check().catch(e => { console.error(e); prisma.$disconnect(); });
