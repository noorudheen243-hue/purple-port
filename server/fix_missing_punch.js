/**
 * Fix PRESENT records with missing punch → update to HALF_DAY
 * Run: node fix_missing_punch.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

async function fixMissingPunch() {
    console.log("=== Fix PRESENT Records with Missing Punch ===\n");

    // Find all PRESENT/LATE records that have no check_in or no check_out
    const badRecords = await prisma.attendanceRecord.findMany({
        where: {
            status: { in: ['PRESENT', 'LATE'] },
            OR: [
                { check_in: null },
                { check_out: null }
            ]
        },
        include: { user: { select: { full_name: true } } },
        orderBy: [{ user_id: 'asc' }, { date: 'asc' }]
    });

    console.log(`Found ${badRecords.length} records with missing punch:\n`);

    let fixed = 0;
    for (const record of badRecords) {
        const d = new Date(record.date);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        const missing = !record.check_in ? 'check_in' : 'check_out';
        console.log(`  ${record.user.full_name} | Day ${d.getDate()} (${dayName}) ${d.getFullYear()}-${d.getMonth() + 1} | Status: ${record.status} | Missing: ${missing}`);

        // Update to HALF_DAY
        await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: { status: 'HALF_DAY' }
        });
        fixed++;
    }

    console.log(`\n✅ Fixed ${fixed} records → updated to HALF_DAY`);

    // Show Arjun's updated attendance
    console.log("\n=== Arjun's Attendance After Fix (Feb 2026) ===");
    const arjun = await prisma.user.findFirst({ where: { full_name: { contains: 'Arjun' } } });
    if (arjun) {
        const records = await prisma.attendanceRecord.findMany({
            where: { user_id: arjun.id, date: { gte: new Date(2026, 1, 1), lte: new Date(2026, 1, 18, 23, 59, 59) } },
            orderBy: { date: 'asc' }
        });
        let lopTotal = 0;
        for (const r of records) {
            const d = new Date(r.date);
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
            const lop = r.status === 'ABSENT' ? 1 : r.status === 'HALF_DAY' ? 0.5 : 0;
            if (lop > 0) lopTotal += lop;
            console.log(`  Day ${d.getDate()} (${dayName}): ${r.status}${lop > 0 ? ` → +${lop} LOP` : ''}`);
        }
        console.log(`\n  Explicit LOP from records: ${lopTotal}`);
    }

    await prisma.$disconnect();
    console.log("\nDone!");
}

fixMissingPunch().catch(e => { console.error("ERROR:", e); prisma.$disconnect(); });
