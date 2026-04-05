import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { ensureLedger, createJournalEntry } from '../accounting/service';

// --- HOLIDAY MANAGEMENT ---

export const listHolidays = async () => {
    return prisma.holiday.findMany({ orderBy: { date: 'asc' } });
};

export const createHoliday = async (data: { name: string; date: Date; description?: string }) => {
    return prisma.holiday.create({ data });
};

export const deleteHoliday = async (id: string) => {
    return prisma.holiday.delete({ where: { id } });
};

// --- PAYROLL ENGINE (AUTO-LOP) ---

export const calculateAutoLOP = async (userId: string, month: number, year: number, calculationDate?: Date) => {
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
    attendance.forEach((a: any) => {
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

    // Determine 'today' in IST to stop counting missing days for future or un-logged current day
    const now = new Date();
    const istNow = new Date(now.getTime() + IST_OFFSET);
    const todayKey = istNow.toISOString().split('T')[0];

    const scanEnd = endDate; 
    let current = new Date(startDate);

    // Single Pass Scan perfectly mirroring AttendanceSummaryPage logic
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
            // Evaluated if record exists
            if (record.status === 'ABSENT' || record.status === 'HALF_DAY') {
                if (!regSet.has(dateKey) && !hasLeave) {
                    lopDays += record.status === 'HALF_DAY' ? 0.5 : 1.0;
                }
            }
        } else {
            // Missing Day Penalty Penalty
            if (dateKey < todayKey && !isSunday && !holidaySet.has(dateKey) && !hasLeave && !regSet.has(dateKey)) {
                lopDays += 1.0;
            }
        }

        current.setDate(current.getDate() + 1);
    }

    return lopDays;
};

export const getSalaryDraft = async (userId: string, month: number, year: number, asOfDate?: string, requestedType: 'MONTHLY' | 'TILL_DATE' = 'MONTHLY') => {
    // 1. Get Staff Profile
    const profile = await prisma.staffProfile.findUnique({
        where: { user_id: userId },
        include: { user: true }
    });
    if (!profile) throw new Error("Staff profile not found");

    // EXCLUDE CO-FOUNDERS
    if (['QIX0001', 'QIX0002'].includes(profile.staff_number)) {
        throw new Error("Payroll processing is disabled for Co-founders (Manual Processing Only).");
    }

    // 2. Determine Calculation Parameters
    const now = new Date();
    const IST_OFFSET = 330 * 60 * 1000;
    const istNow = new Date(now.getTime() + IST_OFFSET);
    istNow.setUTCHours(0, 0, 0, 0);
    const today = new Date(istNow.getTime() - IST_OFFSET); // IST Midnight

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // Last day of month
    const totalDaysInMonth = monthEnd.getDate();

    let calculationDate: Date;
    let isProrated = false;

    // Determine 'Till Date' vs 'Monthly'
    if (String(requestedType).trim() === 'TILL_DATE') {
        if (asOfDate) calculationDate = new Date(asOfDate);
        else if (today.getMonth() === month - 1 && today.getFullYear() === year) calculationDate = new Date(today);
        else calculationDate = new Date(monthEnd);

        calculationDate.setHours(23, 59, 59, 999);
        isProrated = true;
    } else {
        // MONTHLY
        calculationDate = new Date(monthEnd);
        calculationDate.setHours(23, 59, 59, 999);
        isProrated = false;
    }

    // Ensure calculation date is within the requested month
    if (calculationDate > monthEnd) calculationDate = monthEnd;
    if (calculationDate < monthStart) calculationDate = monthStart;

    // 3. Calculate LOP (Always needed for deduction)
    let lopDays = 0;
    try {
        lopDays = await calculateAutoLOP(userId, month, year, calculationDate);
    } catch (error) {
        console.error("Failed to calculate Auto-LOP:", error);
    }

    // 4. Calculate Working Days in the ACTUAL period
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(calculationDate);

    // Fetch Holidays for the period
    const holidays = await prisma.holiday.findMany({
        where: {
            date: { gte: startDate, lte: endDate }
        }
    });

    const holidayDates = new Set(holidays.map(h => h.date.toDateString()));
    let nonWorkingDays = 0;

    // Iterate through each day of the PERIOD (not full month)
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const isSunday = d.getDay() === 0;
        const isHoliday = holidayDates.has(d.toDateString());

        if (isSunday || isHoliday) {
            nonWorkingDays++;
        }
    }

    // Days in period
    const daysInPeriod = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const periodWorkingDays = Math.max(0, daysInPeriod - nonWorkingDays);

    // 5. Calculate Earnings Components (Fixed from Profile)
    const basic = profile.base_salary || 0;
    const hra = profile.hra || 0;
    const conveyance = profile.conveyance_allowance || 0;
    const accommodation = profile.accommodation_allowance || 0;
    const allowances = profile.allowances || 0;
    const incentives = 0; // Placeholder

    const monthlyGrossComponents = basic + hra + conveyance + accommodation + allowances + incentives;

    // 6. Calculate Gross and Net based on Type
    let grossTotal = 0;
    let dailyWage = 0;
    let totalWorkingDays = 0;

    if (String(requestedType).trim() === 'MONTHLY') {
        // Strategy A: Standard Monthly
        // Daily wage always based on 30 days (Indian payroll standard)
        // Total days displayed = actual calendar days in month (31/30/29/28)
        grossTotal = monthlyGrossComponents;
        dailyWage = monthlyGrossComponents / 30; // Always 30 — standard Indian payroll
        totalWorkingDays = totalDaysInMonth;     // Display: actual calendar days
    } else {
        // Strategy B: Till Date
        dailyWage = monthlyGrossComponents / 30; // Always 30 — Indian payroll standard

        const daysTillDate = calculationDate.getDate(); // 1-indexed day of month (calendar days)

        const monthlyFixed = basic + hra + conveyance + accommodation + allowances;
        const perDayFixed = monthlyFixed / 30;

        const baseSalaryTillDate = perDayFixed * daysTillDate;

        grossTotal = Math.round(baseSalaryTillDate + incentives);

        // Show calendar days (e.g. 18 for Feb 18), not working days
        totalWorkingDays = daysTillDate;
    }

    // 7. Calculate Deductions
    const lopDeduction = Math.round(dailyWage * lopDays);

    // 8. Get existing Draft Slip if any
    const existingSlip = await prisma.payrollSlip.findFirst({
        where: {
            user_id: userId,
            run: { month, year } // Implicit join
        }
    });

    // 9. Check Ledgers for Advance
    let salaryAdvanceBalance = 0;
    try {
        const advanceLedger = await prisma.ledger.findFirst({
            where: { entity_id: userId, entity_type: 'USER', head: { code: '1000' } }
        });
        if (advanceLedger && advanceLedger.balance > 0) salaryAdvanceBalance += advanceLedger.balance;

        let staffLedger = await prisma.ledger.findFirst({
            where: { entity_id: userId, entity_type: 'USER', head: { code: '2000' } }
        });
        if (!staffLedger) {
            staffLedger = await prisma.ledger.findFirst({
                where: { name: profile.user.full_name, head: { code: '2000' } }
            });
        }
        if (staffLedger && staffLedger.balance > 0) salaryAdvanceBalance += staffLedger.balance;
    } catch (error) {
        console.error("Failed to fetch ledger balances:", error);
    }


    if (existingSlip) {
        // Validate / Update Advance from Source of Truth (Ledger)
        const currentAdvance = salaryAdvanceBalance;

        // Correct Net Pay Formula: Gross Total (Fresh Calc) - Deductions
        const updatedNetPay = grossTotal - lopDeduction - currentAdvance - existingSlip.other_deductions;

        return {
            ...existingSlip,
            user: profile.user,
            department: profile.department,
            designation: profile.designation,
            isDraft: true,

            // Override with Fresh Calc
            lop_days: lopDays,
            lop_deduction: lopDeduction,
            advance_salary: currentAdvance,
            total_working_days: totalWorkingDays,
            net_pay: Math.max(0, Math.round(updatedNetPay)),

            // Gross Total from Fresh Calc
            gross_total: grossTotal,
            daily_wage: Math.round(dailyWage),

            // Sync Fresh Components from Profile (Fix for Settings Sync)
            basic_salary: basic,
            hra: hra,
            conveyance_allowance: conveyance,
            accommodation_allowance: accommodation,
            allowances: allowances,
            incentives: incentives,

            // Metadata
            calculation_date: calculationDate,
            days_in_period: daysInPeriod,
            is_prorated: isProrated,
            payroll_type: requestedType // Enforce requested type
        };
    }

    // 10. Net Pay (New Slip)
    const netPay = grossTotal - lopDeduction - salaryAdvanceBalance;

    // 11. Return Draft Object
    return {
        user_id: userId,
        name: profile.user.full_name,
        department: profile.department,
        designation: profile.designation,

        // Components
        basic_salary: basic,
        hra,
        conveyance_allowance: conveyance,
        accommodation_allowance: accommodation,
        allowances,
        incentives,

        // Deductions
        lop_days: lopDays,
        lop_deduction: lopDeduction,
        advance_salary: salaryAdvanceBalance,
        other_deductions: 0,

        total_working_days: totalWorkingDays,
        net_pay: Math.max(0, Math.round(netPay)),
        gross_total: Math.round(grossTotal),
        daily_wage: Math.round(dailyWage),

        // Metadata
        calculation_date: calculationDate,
        days_in_period: totalWorkingDays,
        is_prorated: isProrated,
        payroll_type: requestedType,
        isDraft: true
    };
};

export const getPayrollRunDetails = async (month: number, year: number) => {
    const run = await prisma.payrollRun.findFirst({
        where: { month, year },
        include: {
            slips: {
                include: {
                    user: {
                        include: {
                            staffProfile: {
                                select: { designation: true, staff_number: true, department: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!run) return { slips: [], total_payout: 0, total_deductions: 0 };

    const slips = run.slips.map((s: any) => ({
        ...s,
        name: s.user?.full_name || 'Unknown',
        designation: s.user?.staffProfile?.designation || 'Staff'
    }));

    const total_payout = slips.reduce((sum: number, s: any) => sum + s.net_pay, 0);
    const total_deductions = slips.reduce((sum: number, s: any) => sum + s.lop_deduction + (s.advance_salary || 0) + (s.other_deductions || 0), 0);

    return {
        run,
        slips,
        total_payout,
        total_deductions
    };
};

export const savePayrollSlip = async (month: number, year: number, userId: string, data: any) => {
    // 1. Get/Create Draft Run (using userId for legacy call compatibility or just data)
    let run = await prisma.payrollRun.findFirst({ where: { month, year } });
    if (!run) {
        run = await prisma.payrollRun.create({ data: { month, year, status: 'DRAFT', type: data.payroll_type || 'MONTHLY' } });
    }

    if (run.status === 'PAID') throw new Error("Payroll is locked.");

    // 3. Upsert Slip
    const existing = await prisma.payrollSlip.findFirst({
        where: { payroll_run_id: run.id, user_id: userId }
    });

    const slipData = {
        payroll_run_id: run.id,
        user_id: userId,
        basic_salary: Number(data.basic_salary),
        hra: Number(data.hra),
        allowances: Number(data.allowances),
        conveyance_allowance: Number(data.conveyance_allowance),
        accommodation_allowance: Number(data.accommodation_allowance),
        incentives: Number(data.incentives),

        lop_days: Number(data.lop_days),
        lop_deduction: Number(data.lop_deduction),
        advance_salary: Number(data.advance_salary),
        other_deductions: Number(data.other_deductions),

        total_working_days: Math.round(Number(data.total_working_days) || 30),
        net_pay: Number(data.net_pay),
        status: 'IN_PROGRESS',
        payroll_type: data.payroll_type || 'MONTHLY'
    };

    if (existing) {
        return prisma.payrollSlip.update({ where: { id: existing.id }, data: slipData });
    } else {
        return prisma.payrollSlip.create({ data: slipData });
    }
};

export const confirmPayrollRun = async (month: number, year: number) => {
    return prisma.$transaction(async (tx) => {
        const run = await tx.payrollRun.findFirst({ where: { month, year } });
        if (!run) throw new Error("Run not found");

        // 1. Lock Run
        await tx.payrollRun.update({
            where: { id: run.id },
            data: { status: 'PAID', processed_at: new Date() }
        });

        // 2. Post to Ledger (Detailed)
        const slips = await tx.payrollSlip.findMany({ where: { payroll_run_id: run.id } });

        const totalPayout = slips.reduce((sum, s) => sum + s.net_pay, 0);

        const staffEntries: any[] = [];
        const advanceEntries: any[] = [];

        const salaryExpenseLedger = await ensureLedger('INTERNAL', 'SALARY_EXPENSE', '6000');

        for (const slip of slips) {
            const staffLedger = await ensureLedger('USER', slip.user_id, '2000'); // Liability
            staffEntries.push({
                ledger_id: staffLedger.id,
                credit: slip.net_pay,
                debit: 0
            });

            if (slip.advance_salary > 0) {
                const advanceLedger = await ensureLedger('USER', slip.user_id, '1000', `Salary Advance - User ${slip.user_id}`);
                advanceEntries.push({
                    ledger_id: advanceLedger.id,
                    credit: slip.advance_salary,
                    debit: 0
                });
            }
        }

        const balancedExpense = slips.reduce((sum, s) => sum + s.net_pay + (s.advance_salary || 0), 0);

        const journalLines = [
            { ledger_id: salaryExpenseLedger.id, debit: balancedExpense, credit: 0 },
            ...staffEntries,
            ...advanceEntries
        ];

        await createJournalEntry(tx, {
            date: new Date(),
            description: `Payroll Run ${month}/${year}`,
            amount: balancedExpense,
            type: 'EXPENSE',
            created_by_id: 'SYSTEM',
            lines: journalLines
        });

        return { message: "Payroll Processed and Posted", totalPayout };
    });
};

export const getPayrollSlips = async (userId: string | undefined, year: number, month?: number) => {
    const whereClause: any = {
        run: { year } // Filter by year
    };

    if (month) {
        whereClause.run.month = month;
    }

    whereClause.user = {
        staffProfile: {
            staff_number: { notIn: ['QIX0001', 'QIX0002'] }
        }
    };

    if (userId) {
        whereClause.user_id = userId;
    }

    return prisma.payrollSlip.findMany({
        where: whereClause,
        include: {
            run: true,
            user: {
                select: {
                    full_name: true,
                    staffProfile: { select: { designation: true, department: true, staff_number: true } }
                }
            }
        },
        orderBy: { run: { month: 'desc' } }
    });
};

export const processIndividualSlip = async (slipId: string) => {
    const slipForUser = await prisma.payrollSlip.findUnique({ where: { id: slipId } });
    if (!slipForUser) throw new Error("Slip not found");

    const salaryExpenseLedger = await ensureLedger('INTERNAL', 'SALARY_EXPENSE', '6000', 'Salary Expense');
    const staffLedger = await ensureLedger('USER', slipForUser.user_id, '2000');

    let bankLedger = await prisma.ledger.findFirst({
        where: { name: { contains: 'Canara' } }
    });
    if (!bankLedger) {
        bankLedger = await prisma.ledger.findFirst({
            where: { entity_type: 'BANK', status: 'ACTIVE' }
        });
    }
    if (!bankLedger) {
        bankLedger = await ensureLedger('INTERNAL', 'MAIN_BANK', '1000', 'Main Bank A/C');
    }

    let advanceLedger = null;
    if (slipForUser.advance_salary > 0) {
        advanceLedger = await ensureLedger('USER', slipForUser.user_id, '1000', `Salary Advance - User ${slipForUser.user_id}`);
    }

    return prisma.$transaction(async (tx) => {
        const slip = await tx.payrollSlip.findUnique({
            where: { id: slipId },
            include: { run: true, user: true }
        });

        if (!slip) throw new Error("Slip not found");
        if (slip.status === 'PAID') throw new Error("Slip already paid");

        const monthName = new Date(0, slip.run.month - 1).toLocaleString('default', { month: 'short' });
        const periodStr = `${monthName} ${slip.run.year}`;

        let totalExpense = slip.net_pay;
        if (slip.advance_salary > 0) totalExpense += slip.advance_salary;

        const realAccrualLines = [
            { ledger_id: salaryExpenseLedger.id, debit: totalExpense, credit: 0 },
            { ledger_id: staffLedger.id, credit: slip.net_pay, debit: 0 }
        ];
        if (slip.advance_salary > 0 && advanceLedger) {
            realAccrualLines.push({ ledger_id: advanceLedger.id, credit: slip.advance_salary, debit: 0 });
        }

        await createJournalEntry(tx, {
            date: new Date(),
            description: `Payroll Accrual - ${periodStr} - ${slip.user.full_name}`,
            amount: totalExpense,
            type: 'EXPENSE',
            created_by_id: 'SYSTEM',
            lines: realAccrualLines
        });

        const paymentLines = [
            { ledger_id: staffLedger.id, debit: slip.net_pay, credit: 0 },
            { ledger_id: bankLedger.id, credit: slip.net_pay, debit: 0 }
        ];

        await createJournalEntry(tx, {
            date: new Date(),
            description: `Payroll Payment - ${periodStr} - ${slip.user.full_name}`,
            amount: slip.net_pay,
            type: 'PAYMENT',
            created_by_id: 'SYSTEM',
            lines: paymentLines
        });

        return tx.payrollSlip.update({
            where: { id: slipId },
            data: { status: 'PAID' }
        });
    });
};

export const rejectIndividualSlip = async (slipId: string) => {
    const slip = await prisma.payrollSlip.findUnique({ where: { id: slipId } });
    if (!slip) throw new Error("Slip not found");
    if (slip.status === 'PAID') throw new Error("Cannot reject a paid slip");

    return prisma.payrollSlip.delete({ where: { id: slipId } });
};
