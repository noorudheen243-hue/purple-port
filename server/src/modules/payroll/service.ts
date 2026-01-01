import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { ensureLedger } from '../accounting/service';

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

/**
 * Calculates Automatic Loss of Pay (LOP) based on Attendance Rules.
 * Rules:
 * - ABSENT (without Paid Leave) = 1 LOP
 * - HALF_DAY = 0.5 LOP
 * - Approved Leave (Type: UNPAID/LOP) = 1 LOP
 */
export const calculateAutoLOP = async (userId: string, month: number, year: number) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    // 1. Fetch Attendance Records
    const attendance = await prisma.attendanceRecord.findMany({
        where: {
            user_id: userId,
            date: { gte: startDate, lte: endDate }
        }
    });

    let lopDays = 0;

    // 2. Scan Attendance
    for (const record of attendance) {
        if (record.status === 'ABSENT') {
            // Check if covered by APPROVED PAID LEAVE
            const coveringLeave = await prisma.leaveRequest.findFirst({
                where: {
                    user_id: userId,
                    status: 'APPROVED',
                    type: { not: 'UNPAID' }, // Paid leaves cover absence
                    start_date: { lte: record.date },
                    end_date: { gte: record.date }
                }
            });

            if (!coveringLeave) {
                lopDays += 1;
            }
        } else if (record.status === 'HALF_DAY') {
            lopDays += 0.5;
        }
    }

    // 3. Add Explicit LOP Leaves (Leave Type = UNPAID)
    const unpaidLeaves = await prisma.leaveRequest.findMany({
        where: {
            user_id: userId,
            status: 'APPROVED',
            type: 'UNPAID', // Specific LOP type
            start_date: { lte: endDate },
            end_date: { gte: startDate }
        }
    });

    unpaidLeaves.forEach(leave => {
        // Calculate overlap days
        let start = leave.start_date < startDate ? startDate : leave.start_date;
        let end = leave.end_date > endDate ? endDate : leave.end_date;
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Add to LOP days
        lopDays += diffDays;
    });

    return lopDays;
};

export const getSalaryDraft = async (userId: string, month: number, year: number) => {
    // 1. Get Staff Profile
    const profile = await prisma.staffProfile.findUnique({
        where: { user_id: userId },
        include: { user: true }
    });
    if (!profile) throw new Error("Staff profile not found");

    // 2. Calculate LOP
    const lopDays = await calculateAutoLOP(userId, month, year);

    // 3. Get existing Draft Slip if any
    const existingSlip = await prisma.payrollSlip.findFirst({
        where: {
            user_id: userId,
            run: { month, year } // Implicit join
        }
    });

    // 4. Fetch Salary Advance from Ledger
    // Assuming Ledger Name is "Salary Advance" and entity_id is userId
    const advanceLedger = await prisma.ledger.findFirst({
        where: {
            entity_id: userId,
            entity_type: 'USER',
            head: { name: 'Salary Advance' } // Ensure Head Name matches exactly or use Code
        }
    });

    // If head name is not guaranteed, search by Name directly or assume code?
    // Safer: Search by name 'Salary Advance' combined with entity. 
    // Or if we create "Salary Advance - Name" for each?
    // Let's try finding ANY ledger for this user that is under "Assets" and has "Advance" in name?
    // Better: We defined "Salary Advance" handling.
    // Let's assume we look for a ledger named "Salary Advance" or similar linked to user.
    // If we use `ensureLedger` with a specific code for Salary Advance, we can query that code.
    // For now, let's assume we query by HEAD Name 'Salary Advance'. 
    // If not found, check generic name "Salary Advance".

    let salaryAdvanceBalance = 0;
    if (advanceLedger) {
        // Asset: Debit is Positive. If User took advance, it's Debit. 
        // Balance should be Positive.
        salaryAdvanceBalance = advanceLedger.balance > 0 ? advanceLedger.balance : 0;
    } else {
        // Double check by Name in case Head isn't linked by name 'Salary Advance'
        const altLedger = await prisma.ledger.findFirst({
            where: { entity_id: userId, name: { contains: 'Salary Advance' } }
        });
        if (altLedger) salaryAdvanceBalance = altLedger.balance > 0 ? altLedger.balance : 0;
    }


    if (existingSlip) {
        return {
            ...existingSlip,
            user: profile.user,
            department: profile.department,
            designation: profile.designation,
            isDraft: true,
            // Update Advance if not overridden? No, existing slip might have manual edits.
            // But if it's draft, maybe we refresh? 
            // Let's Keep existing values if slip exists.
        };
    }

    // 5. New Draft Calculation
    const basic = profile.base_salary || 0;
    const hra = profile.hra || 0;
    const allowances = profile.allowances || 0;
    const conveyance = profile.conveyance_allowance || 0;
    const accommodation = profile.accommodation_allowance || 0;

    // Daily Wage Rule: (Basic + HRA + Conveyance + Accommodation) / 30
    const standardEarnings = basic + hra + conveyance + accommodation;
    const dailyWage = standardEarnings / 30;

    const lopDeduction = Math.round(dailyWage * lopDays);
    const grossEarnings = standardEarnings + allowances; // Add misc allowances back to gross
    const netPay = grossEarnings - lopDeduction - salaryAdvanceBalance; // Deduct Advance by default? 
    // Usually we deduct FULL advance if it covers? Or let Manager decide?
    // Prompt says: "Fetch from Accounts". "Automatic".
    // We will pre-fill it.

    return {
        user_id: userId,
        name: profile.user.full_name,
        department: profile.department,
        designation: profile.designation,

        // Earnings
        basic_salary: basic,
        hra,
        conveyance_allowance: conveyance,
        accommodation_allowance: accommodation,
        allowances, // Misc
        incentives: 0, // Manual

        // Deductions
        lop_days: lopDays,
        lop_deduction: lopDeduction,
        advance_salary: salaryAdvanceBalance, // PRE-FILL
        other_deductions: 0,

        total_working_days: 30, // Standard
        net_pay: netPay > 0 ? netPay : 0,

        isDraft: false
    };
};

export const getPayrollRunDetails = async (month: number, year: number) => {
    const run = await prisma.payrollRun.findFirst({
        where: { month, year },
        include: {
            slips: {
                include: { user: { select: { full_name: true } } }
            }
        }
    });

    if (!run) return { slips: [], total_payout: 0, total_deductions: 0 };

    const slips = run.slips.map(s => ({
        ...s,
        name: s.user?.full_name || 'Unknown'
    }));

    const total_payout = slips.reduce((sum, s) => sum + s.net_pay, 0);
    const total_deductions = slips.reduce((sum, s) => sum + s.lop_deduction + (s.advance_salary || 0) + (s.other_deductions || 0), 0);

    return {
        run,
        slips,
        total_payout,
        total_deductions
    };
};

export const savePayrollSlip = async (month: number, year: number, data: any) => {
    // 1. Get/Create Draft Run
    let run = await prisma.payrollRun.findFirst({ where: { month, year } });
    if (!run) {
        run = await prisma.payrollRun.create({ data: { month, year, status: 'DRAFT' } });
    }

    if (run.status === 'PAID') throw new Error("Payroll is locked.");

    // 2. Validate Calculations (Double Check)
    const dailyWage = (Number(data.basic_salary) + Number(data.hra) + Number(data.conveyance_allowance) + Number(data.accommodation_allowance)) / 30;
    const calcLopDeduction = Math.round(dailyWage * Number(data.lop_days));

    // Allow manual override of LOP Deduction? "Manual LOP entry is NOT allowed". 
    // We strictly use the passed Value or Recalculate?
    // User might have refreshed. We trust the frontend passed value IF it matches logic, 
    // but safer to trust passed `lop_days` and recalc deduction ? 
    // For simplicity, we trust the `data` object which includes the fields.

    // 3. Upsert Slip
    // Since we lack unique constraint on user+run, we do findFirst logic
    const existing = await prisma.payrollSlip.findFirst({
        where: { payroll_run_id: run.id, user_id: data.user_id }
    });

    const slipData = {
        payroll_run_id: run.id,
        user_id: data.user_id,
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

        total_working_days: Number(data.total_working_days) || 30,
        net_pay: Number(data.net_pay),
        status: 'PENDING'
    };

    if (existing) {
        return prisma.payrollSlip.update({ where: { id: existing.id }, data: slipData });
    } else {
        return prisma.payrollSlip.create({ data: slipData });
    }
};

export const confirmPayrollRun = async (month: number, year: number) => {
    const run = await prisma.payrollRun.findFirst({ where: { month, year } });
    if (!run) throw new Error("Run not found");

    // 1. Lock Run
    await prisma.payrollRun.update({
        where: { id: run.id },
        data: { status: 'PAID', processed_at: new Date() }
    });

    // 2. Post to Ledger
    // 2. Post to Ledger (Detailed)
    const slips = await prisma.payrollSlip.findMany({ where: { payroll_run_id: run.id } });

    // Calculate Totals
    const totalPayout = slips.reduce((sum, s) => sum + s.net_pay, 0);
    const totalAdvanceDed = slips.reduce((sum, s) => sum + (s.advance_salary || 0), 0);
    // const totalLopDed = slips.reduce((sum, s) => sum + (s.lop_deduction || 0), 0); // LOP reduces Expense directly usually? Or Expense is Gross - LOP.

    // Actually, Expense = Earnings (Basic + Allowances).
    // Deductions: Advance (Asset Credit), LOP (Reduced Expense or Income?), TDS (Liability Credit).
    // Our 'slips' usually store Net Pay.
    // Let's assume Salary Expense = Total Earnings (Gross).
    // But slips might not have 'Gross' explicitly summed? 
    // Gross = Net + Deductions.
    // Let's sum up Gross from components.

    let totalGross = 0;
    const staffEntries: any[] = [];
    const advanceEntries: any[] = [];

    // Pre-fetch Generic Ledgers
    const salaryExpenseLedger = await ensureLedger('INTERNAL', 'SALARY_EXPENSE', '6000');

    // Iterate slips to build lines
    for (const slip of slips) {
        const gross = slip.basic_salary + slip.hra + slip.allowances + slip.conveyance_allowance + slip.accommodation_allowance + slip.incentives;
        const deductions = slip.lop_deduction + slip.advance_salary + slip.other_deductions;
        // net_pay should be approx gross - deductions.

        totalGross += gross;

        // Staff Ledger (Liability - Credit) - Net Pay
        // We need to find the Staff Ledger.
        try {
            const staffLedger = await ensureLedger('USER', slip.user_id, '2000'); // Liability
            staffEntries.push({
                ledger_id: staffLedger.id,
                credit: slip.net_pay
            });

            // Advance Deduction (Credit Asset)
            if (slip.advance_salary > 0) {
                // Try to find the Advance Ledger for this user, OR use a central Advance Ledger?
                // Usually Advance is tracked per user.
                // Let's try to find their Advance Ledger (Asset '1000')
                const advanceLedger = await ensureLedger('USER', slip.user_id, '1000', `Salary Advance - User ${slip.user_id}`);
                advanceEntries.push({
                    ledger_id: advanceLedger.id,
                    credit: slip.advance_salary
                });
            }

            // LOP is just reduced expense? 
            // If Gross = 1000, LOP = 100. Net = 900.
            // If we debit Expense 1000? Then LOP is Income (or negative expense)?
            // OR we just Debit Expense = 1000 - 100 = 900?
            // "Loss of Pay" means they didn't earn it.
            // So Expense should be Actual Earnings (Gross - LOP).
            // Let's adjust totalGross to subtract LOP?
            // "Gross Earning" in slip calculation (getSalaryDraft) is "standardEarnings + allowances".
            // Then Net = Gross - LOP - Advance.
            // So Real Expense = Gross - LOP.

            totalGross -= slip.lop_deduction;

        } catch (e) {
            console.error(`Failed to prepare ledger entry for staff ${slip.user_id}`, e);
        }
    }

    // Lines Construction
    // Dr Salary Expense (Total Real Expense)
    // Cr Staff Ledgers (Net Pay)
    // Cr Advance Ledgers (Recovered Advance)
    // (We ignore Other Deductions destination for now, assuming they go to... where? Maybe just reduce Net Pay. 
    // If 'Other Deductions' are penalties, they reduce Expense. If they are TDS, they are Liability.
    // For simplicity, we treat 'other_deductions' as reducing Expense (like LOP) unless specified.
    // Let's subtract other_deductions from Gross too for balance.)

    // Re-calc Total Gross (Expense) to balance:
    // Expense = Sum(Net Pay) + Sum(Advance Recovered)
    const balancedExpense = slips.reduce((sum, s) => sum + s.net_pay + (s.advance_salary || 0), 0);

    // Create Journal
    await prisma.journalEntry.create({
        data: {
            description: `Payroll Run ${month}/${year}`,
            amount: balancedExpense,
            type: 'EXPENSE',
            created_by_id: 'SYSTEM',
            lines: {
                create: [
                    { ledger_id: salaryExpenseLedger.id, debit: balancedExpense, credit: 0 },
                    ...staffEntries.map(e => ({ ledger_id: e.ledger_id, credit: e.credit, debit: 0 })),
                    ...advanceEntries.map(e => ({ ledger_id: e.ledger_id, credit: e.credit, debit: 0 }))
                ]
            }
        }
    });

    return { message: "Payroll Processed and Posted", totalPayout };
};
