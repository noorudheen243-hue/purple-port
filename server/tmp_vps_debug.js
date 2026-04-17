const { PrismaClient } = require('@prisma/client');
const { calculateAutoLOP } = require('./dist/modules/payroll/service.js');

const prisma = new PrismaClient();

async function checkArjun() {
    console.log("Checking Arjun LOP Details...");
    const u = await prisma.user.findFirst({ where: { full_name: { contains: "Arjun" } } });
    if(!u) return console.log("Arjun not found in DB.");
    
    console.log("Running copied logic to print debug...");
    
    // START MANUAL COPY OF LOGIC
    const userId = u.id;
    const month = 3;
    const year = 2026;
    
    const startDate = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const endDate = monthEnd;

    const attendance = await prisma.attendanceRecord.findMany({
        where: { user_id: userId, date: { gte: startDate, lte: endDate } }
    });
    const holidays = await prisma.holiday.findMany({
        where: { date: { gte: startDate, lte: endDate } }
    });
    const approvedLeaves = await prisma.leaveRequest.findMany({
        where: { user_id: userId, status: 'APPROVED', start_date: { lte: endDate }, end_date: { gte: startDate } }
    });
    const approvedRegs = await prisma.regularisationRequest.findMany({
        where: { user_id: userId, status: 'APPROVED', date: { gte: startDate, lte: endDate } }
    });

    const IST_OFFSET = 330 * 60 * 1000;
    const attendanceMap = {};
    attendance.forEach((a) => {
        const istDate = new Date(a.date.getTime() + IST_OFFSET);
        attendanceMap[istDate.toISOString().split('T')[0]] = a;
    });

    const holidaySet = new Set(holidays.map(h => new Date(h.date.getTime() + IST_OFFSET).toISOString().split('T')[0]));
    const regSet = new Set(approvedRegs.map(r => new Date(r.date.getTime() + IST_OFFSET).toISOString().split('T')[0]));

    let lopDays = 0;
    const now = new Date();
    const istNow = new Date(now.getTime() + IST_OFFSET);
    const todayKey = istNow.toISOString().split('T')[0];

    const scanEnd = endDate; 
    let current = new Date(startDate);

    while (current <= scanEnd) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;

        const isSunday = current.getDay() === 0;

        const hasLeave = approvedLeaves.some(l => {
            const lStart = new Date(l.start_date.getTime() + IST_OFFSET).toISOString().split('T')[0];
            const lEnd = new Date(l.end_date.getTime() + IST_OFFSET).toISOString().split('T')[0];
            return dateKey >= lStart && dateKey <= lEnd;
        });

        const record = attendanceMap[dateKey];
        if (record) {
            if (record.status === 'ABSENT' || record.status === 'HALF_DAY') {
                if (!regSet.has(dateKey) && !hasLeave) {
                    const add = record.status === 'HALF_DAY' ? 0.5 : 1.0;
                    lopDays += add;
                    console.log(`[LOGGED ${record.status}] ${dateKey} -> Added ${add}`);
                } else {
                    console.log(`[SAVED ${record.status}] ${dateKey} -> Excused due to Leave/Reg`);
                }
            }
        } else {
            if (dateKey < todayKey && !isSunday && !holidaySet.has(dateKey) && !hasLeave && !regSet.has(dateKey)) {
                lopDays += 1.0;
                console.log(`[MISSING] ${dateKey} -> Added 1.0 Penalty`);
            }
        }

        current.setDate(current.getDate() + 1);
    }

    console.log("Total Debug LOP:", lopDays);
    const prodLop = await calculateAutoLOP(u.id, 3, 2026);
    console.log("Real Function LOP:", prodLop);

    process.exit(0);
}

checkArjun();
