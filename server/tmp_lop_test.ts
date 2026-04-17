import prisma from './src/utils/prisma';

export const calculateAutoLOPTest = async (userId: string, month: number, year: number, calculationDate?: Date) => {
    const startDate = new Date(year, month - 1, 1);
    let endDate = calculationDate ? new Date(calculationDate) : new Date(year, month, 0);

    const monthEnd = new Date(year, month, 0);
    if (endDate > monthEnd) endDate = monthEnd;

    // 1. Fetch Attendance Records 
    const attendance = await prisma.attendanceRecord.findMany({
        where: {
            user_id: userId,
            date: { gte: startDate, lte: endDate }
        }
    });

    // 2. Fetch Holidays
    const holidays = await prisma.holiday.findMany({
        where: { date: { gte: startDate, lte: endDate } }
    });

    // 3. Fetch Approved Leaves
    const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
            user_id: userId,
            status: 'APPROVED',
            start_date: { lte: endDate },
            end_date: { gte: startDate }
        }
    });

    // 4. Fetch Approved Regularizations
    const approvedRegs = await prisma.regularisationRequest.findMany({
        where: {
            user_id: userId,
            status: 'APPROVED',
            date: { gte: startDate, lte: endDate }
        }
    });

    const IST_OFFSET = 330 * 60 * 1000;

    // Build Maps using IST YYYY-MM-DD keys
    const attendanceMap: Record<string, any> = {};
    attendance.forEach(a => {
        const istDate = new Date(a.date.getTime() + IST_OFFSET);
        attendanceMap[istDate.toISOString().split('T')[0]] = a;
    });

    const holidaySet = new Set(holidays.map(h => {
        const istDate = new Date(h.date.getTime() + IST_OFFSET);
        return istDate.toISOString().split('T')[0];
    }));

    const regSet = new Set(approvedRegs.map(r => {
        const istDate = new Date(r.date.getTime() + IST_OFFSET);
        return istDate.toISOString().split('T')[0];
    }));

    let lopDays = 0;

    // Determine 'today' in IST to stop counting missing days
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
                    lopDays += record.status === 'HALF_DAY' ? 0.5 : 1.0;
                }
            }
        } else {
            // Missing Day Penalty
            if (dateKey < todayKey && !isSunday && !holidaySet.has(dateKey) && !hasLeave && !regSet.has(dateKey)) {
                lopDays += 1.0;
            }
        }

        current.setDate(current.getDate() + 1);
    }

    return lopDays;
};

// Test implementation
async function run() {
    // Find arjun
    const u = await prisma.user.findFirst({ where: { full_name: { contains: "Arjun" } } });
    if(u) {
        console.log("Found:", u.full_name, u.id);
        const lops = await calculateAutoLOPTest(u.id, 3, 2026);
        console.log("Calculated LOP:", lops);
    } else {
        console.log("Arjun not found locally");
    }
}
run();
