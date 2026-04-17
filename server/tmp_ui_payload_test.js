const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "file:../dev.db" } } });

async function testAttendanceSummary() {
    console.log("Analyzing Attendance Summary Payload from VPS Database...");
    const u = await prisma.user.findUnique({ where: { id: "9d35b443-86ba-4efd-8681-e5f8daee7cc7" }});
    
    const month = 3;
    const year = 2026;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendances = await prisma.attendanceRecord.findMany({
        where: { user_id: u.id, date: { gte: startDate, lte: endDate } }
    });

    const IST_OFFSET = 330 * 60 * 1000;
    
    let UI_ATTENDANCE_MAP = {};
    attendances.forEach(a => {
        const date = new Date(a.date.getTime() + IST_OFFSET);
        const dateKey = date.toISOString().split('T')[0];
        // The API returns an object mapped by dateKey: 
        // attendanceMap[dateString] = { status: a.status, ... }
        UI_ATTENDANCE_MAP[dateKey] = a;
    });

    let uiHalfDays = 0;
    let uiAbsents = 0;
    let uiMissingUI = 0;
    
    Object.values(UI_ATTENDANCE_MAP).forEach(a => {
        if (a.status === 'HALF_DAY') uiHalfDays++;
        if (a.status === 'ABSENT') uiAbsents++;
    });

    const daysInMonth = Array.from({ length: endDate.getDate() }, (_, i) => i + 1);
    daysInMonth.forEach(day => {
        const dateKey = `${year}-03-${String(day).padStart(2, '0')}`;
        const record = UI_ATTENDANCE_MAP[dateKey];
        if (!record) {
             const dateObj = new Date(year, month - 1, day);
             const isSunday = dateObj.getDay() === 0;
             const isHoliday = false; // assume false
             const today = new Date();
             if(dateObj < today && !isSunday) {
                 uiMissingUI++;
             }
        }
    });

    console.log(`UI Summary receives -> ${uiHalfDays} Half Days, ${uiAbsents} Absents, and evaluates ${uiMissingUI} Missing Days.`);
    
    process.exit(0);
}
testAttendanceSummary();
