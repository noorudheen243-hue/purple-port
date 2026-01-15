// @ts-nocheck
const { AttendanceService } = require('./src/modules/attendance/service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Direct Instance to be safe

async function checkService() {
    console.log('--- CHECKING SERVICE OUTPUT ---');
    // Mimic the query params for Today
    const todayStr = '2026-01-09';
    const start = new Date(todayStr); // UTC Midnight usually
    const end = new Date(todayStr);
    end.setHours(23, 59, 59, 999);

    console.log(`Query: ${start.toISOString()} to ${end.toISOString()}`);

    // Call the same function the Controller calls
    const logs = await AttendanceService.getBiometricLogs(start, end);

    console.log(`Service returned ${logs.length} rows.`);

    // Filter for known present users
    const present = logs.filter(l => l.status !== 'ABSENT');
    console.log(`Found ${present.length} PRESENT rows.`);

    if (present.length === 0) {
        console.log('FAIL: Service returning ABSENT for everyone.');

        // Debug Matching Logic
        console.log('--- MANUAL DEBUG MATCHING ---');
        const allStaff = await prisma.user.findMany({ where: { role: { not: 'CLIENT' } } });
        const records = await prisma.attendanceRecord.findMany({
            where: { date: { gte: start, lte: end } }
        });

        console.log(`Manual DB Fetch: ${records.length} records, ${allStaff.length} staff.`);

        if (records.length > 0) {
            console.log('Sample Record:', records[0]);
            const r = records[0];
            const rDateStr = r.date.toISOString().split('T')[0];
            const targetDateStr = start.toISOString().split('T')[0];

            console.log(`Date Check: Record '${rDateStr}' vs Target '${targetDateStr}'`);

            // Check User ID Match
            const staffUser = allStaff.find(u => u.id === r.user_id);
            console.log(`User Match: Record UserID ${r.user_id} -> Staff Found? ${!!staffUser} (${staffUser?.full_name})`);
        }
    } else {
        present.forEach(p => console.log(`- ${p.user_name}: ${p.check_in}`));
    }
}

checkService().catch(console.error).finally(() => process.exit());
