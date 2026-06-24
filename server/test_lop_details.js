const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  // Find a user and date having status === 'HALF_DAY'
  const record = await prisma.attendanceRecord.findFirst({
    where: { status: 'HALF_DAY' },
    select: { user_id: true, date: true, user: { select: { full_name: true } } }
  });

  if (!record) {
    console.log('No HALF_DAY records found in database.');
    return;
  }

  const userId = record.user_id;
  const date = new Date(record.date);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  console.log(`Found HALF_DAY record for ${record.user.full_name} (${userId}) on ${date.toISOString()} (Month: ${month}, Year: ${year})`);

  // Now let's run a custom version of calculateAutoLOP that prints day-by-day details
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const searchStart = new Date(startDate);
  searchStart.setDate(searchStart.getDate() - 1);

  const attendance = await prisma.attendanceRecord.findMany({
    where: { user_id: userId, date: { gte: searchStart, lte: endDate } }
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

  const criteriaConfigs = await prisma.attendanceCriteriaConfig.findMany({
    where: { is_enabled: true }
  });
  const enabledRules = new Set(criteriaConfigs.map(c => c.rule_code));

  const IST_OFFSET = 330 * 60 * 1000;
  const attendanceMap = {};
  attendance.forEach((a) => {
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
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET);
  const todayKey = istNow.toISOString().split('T')[0];

  let current = new Date(startDate);
  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    const isSunday = current.getDay() === 0;
    const ruleA4Enabled = enabledRules.has('A4');
    const ruleB1Enabled = enabledRules.has('B1');

    const leaveInfo = approvedLeaves.find(l => {
      const lStart = new Date(l.start_date.getTime() + IST_OFFSET).toISOString().split('T')[0];
      const lEnd = new Date(l.end_date.getTime() + IST_OFFSET).toISOString().split('T')[0];
      return dateKey >= lStart && dateKey <= lEnd;
    });

    const isPaidLeave = leaveInfo && !['UNPAID', 'LOP'].includes(leaveInfo.type);
    const isHalfDayLeave = leaveInfo?.is_half_day || false;

    const record = attendanceMap[dateKey];
    let dailyLop = 0;
    let desc = 'PRESENT / NORMAL';

    if (record) {
      if (record.status === 'ABSENT' || record.status === 'HALF_DAY' || record.status === 'LOP') {
        const shouldSkipLOP = ruleA4Enabled && (isSunday || holidaySet.has(dateKey));
        if (!regSet.has(dateKey) && !shouldSkipLOP) {
          let deduction = record.status === 'HALF_DAY' ? 0.5 : 1.0;
          if (isPaidLeave) {
            deduction = isHalfDayLeave ? Math.max(0, deduction - 0.5) : 0;
          } else if (leaveInfo) {
            deduction = record.status === 'HALF_DAY' ? 0.5 : 1.0;
          }
          dailyLop = deduction;
          desc = `${record.status} (Deduction: ${deduction})`;
        } else {
          desc = `${record.status} (Skipped LOP - Sunday/Holiday/Regularized)`;
        }
      } else {
        desc = record.status;
      }
    } else {
      const isNonWorkingDay = ruleA4Enabled && (isSunday || holidaySet.has(dateKey));
      if (dateKey < todayKey && !isNonWorkingDay && !regSet.has(dateKey) && ruleB1Enabled) {
        let deduction = 1.0;
        if (isPaidLeave) {
          deduction = isHalfDayLeave ? 0.5 : 0;
        }
        dailyLop = deduction;
        desc = `MISSING DAY (Deduction: ${deduction})`;
      } else {
        desc = isNonWorkingDay ? 'WEEKLY OFF / HOLIDAY (Skipped LOP)' : 'FUTURE / PENALTY DISABLED';
      }
    }

    if (dailyLop > 0) {
      lopDays += dailyLop;
      console.log(`[LOP] ${dateKey}: ${desc} -> Running Total: ${lopDays}`);
    } else {
      console.log(`[OK]  ${dateKey}: ${desc}`);
    }

    current.setDate(current.getDate() + 1);
  }

  console.log(`=== Final Calculated LOP Days: ${lopDays} ===`);
}

run().then(() => process.exit(0)).catch(console.error);
