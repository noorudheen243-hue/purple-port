/**
 * Fix Duplicate Attendance Records
 * 
 * Run on VPS: node fix_duplicate_attendance.js
 * 
 * This script:
 * 1. Finds all duplicate attendance records (same user, same date)
 * 2. For each duplicate set, keeps the MOST SEVERE status:
 *    ABSENT > HALF_DAY > PRESENT > WFH
 * 3. Deletes the extras
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

// Status priority: higher = more severe (kept over less severe)
const STATUS_PRIORITY = {
    'ABSENT': 4,
    'HALF_DAY': 3,
    'WFH': 2,
    'PRESENT': 1,
    'CHECK_OUT': 0
};

async function fixDuplicates() {
    console.log("=== Fix Duplicate Attendance Records ===\n");

    // Get all attendance records
    const all = await prisma.attendanceRecord.findMany({
        include: { user: { select: { full_name: true } } },
        orderBy: [{ user_id: 'asc' }, { date: 'asc' }]
    });

    // Group by user_id + date
    const grouped = {};
    for (const record of all) {
        const dateStr = new Date(record.date).toDateString();
        const key = `${record.user_id}__${dateStr}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(record);
    }

    let totalDuplicates = 0;
    let totalFixed = 0;

    for (const [key, records] of Object.entries(grouped)) {
        if (records.length <= 1) continue;

        const userName = records[0].user.full_name;
        const dateStr = new Date(records[0].date).toDateString();
        console.log(`\nDuplicate found: ${userName} on ${dateStr}`);
        console.log(`  Records: ${records.map(r => `${r.status}(${r.id.slice(0, 8)})`).join(', ')}`);

        // Sort by priority descending — keep the most severe
        records.sort((a, b) => (STATUS_PRIORITY[b.status] || 0) - (STATUS_PRIORITY[a.status] || 0));

        const keep = records[0];
        const toDelete = records.slice(1);

        console.log(`  Keeping: ${keep.status} (${keep.id.slice(0, 8)})`);
        console.log(`  Deleting: ${toDelete.map(r => `${r.status}(${r.id.slice(0, 8)})`).join(', ')}`);

        for (const rec of toDelete) {
            await prisma.attendanceRecord.delete({ where: { id: rec.id } });
            totalDuplicates++;
        }
        totalFixed++;
    }

    console.log(`\n=== Summary ===`);
    console.log(`Groups with duplicates: ${totalFixed}`);
    console.log(`Records deleted: ${totalDuplicates}`);

    // Now show Arjun's clean attendance
    console.log("\n=== Arjun's Attendance After Cleanup ===");
    const arjun = await prisma.user.findFirst({ where: { full_name: { contains: 'Arjun' } } });
    if (arjun) {
        const records = await prisma.attendanceRecord.findMany({
            where: { user_id: arjun.id, date: { gte: new Date(2026, 1, 1), lte: new Date(2026, 1, 18, 23, 59, 59) } },
            orderBy: { date: 'asc' }
        });
        for (const r of records) {
            const d = new Date(r.date);
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
            console.log(`  Day ${d.getDate()} (${dayName}): ${r.status}`);
        }
    }

    await prisma.$disconnect();
    console.log("\nDone!");
}

fixDuplicates().catch(e => { console.error("ERROR:", e); prisma.$disconnect(); });
