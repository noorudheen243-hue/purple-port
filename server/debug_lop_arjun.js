/**
 * Debug LOP Calculation for Arjun
 * Run: node debug_lop_arjun.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

async function debugLOP() {
    const month = 2, year = 2026;
    const today = new Date(2026, 1, 18); // Feb 18 2026
    today.setHours(0, 0, 0, 0);

    // Find Arjun
    const user = await prisma.user.findFirst({ where: { full_name: { contains: 'Arjun' } } });
    if (!user) { console.log("Arjun not found"); return; }
    console.log(`User: ${user.full_name} (${user.id})\n`);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(today); // Till today Feb 18
    endDate.setHours(23, 59, 59, 999);

    // Get attendance
    const attendance = await prisma.attendanceRecord.findMany({
        where: { user_id: user.id, date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'asc' }
    });

    console.log("=== Attendance Records ===");
    for (const a of attendance) {
        const d = new Date(a.date);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        console.log(`  Day ${d.getDate()} (${dayName}): ${a.status}`);
    }

    // Get approved leaves
    const approvedLeaves = await prisma.leaveRequest.findMany({
        where: { user_id: user.id, status: 'APPROVED', start_date: { lte: endDate }, end_date: { gte: startDate } }
    });
    console.log(`\nApproved Leaves: ${approvedLeaves.length}`);

    // Get holidays
    const holidays = await prisma.holiday.findMany({ where: { date: { gte: startDate, lte: endDate } } });
    const holidayDates = new Set(holidays.map(h => h.date.toDateString()));
    console.log(`Holidays in period: ${holidays.length}`);

    // Simulate LOP calculation
    let lopDays = 0;
    const attendanceDates = new Set(attendance.map(a => new Date(a.date).toDateString()));

    console.log("\n=== LOP Breakdown ===");

    // Step 1: Explicit statuses
    for (const record of attendance) {
        const d = new Date(record.date);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        if (record.status === 'ABSENT') {
            const coveringLeave = approvedLeaves.find(l => {
                const ls = new Date(l.start_date); ls.setHours(0, 0, 0, 0);
                const le = new Date(l.end_date); le.setHours(23, 59, 59, 999);
                return d >= ls && d <= le;
            });
            if (!coveringLeave) {
                console.log(`  Day ${d.getDate()} (${dayName}): ABSENT → +1 LOP`);
                lopDays += 1;
            } else {
                console.log(`  Day ${d.getDate()} (${dayName}): ABSENT but covered by leave`);
            }
        } else if (record.status === 'HALF_DAY') {
            console.log(`  Day ${d.getDate()} (${dayName}): HALF_DAY → +0.5 LOP`);
            lopDays += 0.5;
        }
    }

    // Step 2: Missing days
    const scanEnd = endDate > today ? today : endDate;
    console.log("\n=== Missing Days (no attendance record) ===");
    for (let d = new Date(startDate); d <= scanEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        const isSunday = d.getDay() === 0;
        const isHoliday = holidayDates.has(dateStr);
        const hasRecord = attendanceDates.has(dateStr);
        const hasLeave = approvedLeaves.some(l => {
            const ls = new Date(l.start_date); ls.setHours(0, 0, 0, 0);
            const le = new Date(l.end_date); le.setHours(23, 59, 59, 999);
            return d >= ls && d <= le;
        });

        if (!hasRecord && !isSunday && !isHoliday && !hasLeave) {
            console.log(`  Day ${d.getDate()} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}): MISSING → +1 LOP`);
            lopDays += 1;
        } else if (!hasRecord) {
            const reason = isSunday ? 'Sunday' : isHoliday ? 'Holiday' : hasLeave ? 'On Leave' : '';
            console.log(`  Day ${d.getDate()} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}): MISSING but skipped (${reason})`);
        }
    }

    console.log(`\n=== TOTAL LOP: ${lopDays} days ===`);
    await prisma.$disconnect();
}

debugLOP().catch(e => { console.error(e); prisma.$disconnect(); });
