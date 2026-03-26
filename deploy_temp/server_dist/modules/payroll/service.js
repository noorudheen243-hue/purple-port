"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectIndividualSlip = exports.processIndividualSlip = exports.getPayrollSlips = exports.confirmPayrollRun = exports.savePayrollSlip = exports.getPayrollRunDetails = exports.getSalaryDraft = exports.calculateAutoLOP = exports.deleteHoliday = exports.createHoliday = exports.listHolidays = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const service_1 = require("../accounting/service");
// --- HOLIDAY MANAGEMENT ---
const listHolidays = () => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.holiday.findMany({ orderBy: { date: 'asc' } });
});
exports.listHolidays = listHolidays;
const createHoliday = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.holiday.create({ data });
});
exports.createHoliday = createHoliday;
const deleteHoliday = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.holiday.delete({ where: { id } });
});
exports.deleteHoliday = deleteHoliday;
// --- PAYROLL ENGINE (AUTO-LOP) ---
const calculateAutoLOP = (userId, month, year, calculationDate) => __awaiter(void 0, void 0, void 0, function* () {
    const startDate = new Date(year, month - 1, 1);
    let endDate = calculationDate ? new Date(calculationDate) : new Date(year, month, 0);
    const monthEnd = new Date(year, month, 0);
    if (endDate > monthEnd)
        endDate = monthEnd;
    // 1. Fetch Attendance Records 
    const attendance = yield prisma_1.default.attendanceRecord.findMany({
        where: {
            user_id: userId,
            date: { gte: startDate, lte: endDate }
        }
    });
    // 2. Fetch Holidays
    const holidays = yield prisma_1.default.holiday.findMany({
        where: { date: { gte: startDate, lte: endDate } }
    });
    const holidayDates = new Set(holidays.map(h => h.date.toDateString()));
    const attendanceDates = new Set(attendance.map((a) => a.date.toDateString()));
    let lopDays = 0;
    // 4. Count LOP based on Attendance Records (Source of Truth)
    for (const record of attendance) {
        if (record.status === 'ABSENT') {
            // Check covering leave (redundancy check, usually ABSENT implies LOP unless regularized)
            const coveringLeave = yield prisma_1.default.leaveRequest.findFirst({
                where: {
                    user_id: userId,
                    status: 'APPROVED',
                    start_date: { lte: record.date },
                    end_date: { gte: record.date }
                }
            });
            if (!coveringLeave) {
                lopDays += 1;
            }
        }
        else if (record.status === 'HALF_DAY') {
            lopDays += 0.5;
        }
        // REGULARIZED, PRESENT, LATE = 0 LOP
    }
    // 5. Add Explicit LOP Leaves (Leave Type = UNPAID or LOP)
    const unpaidLeaves = yield prisma_1.default.leaveRequest.findMany({
        where: {
            user_id: userId,
            status: 'APPROVED',
            type: { in: ['UNPAID', 'LOP'] }, // Specific LOP types
            start_date: { lte: endDate },
            end_date: { gte: startDate }
        }
    });
    unpaidLeaves.forEach(leave => {
        let start = leave.start_date < startDate ? startDate : leave.start_date;
        let end = leave.end_date > endDate ? endDate : leave.end_date;
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        lopDays += diffDays;
    });
    // 6. Count Missing Attendance Records (Days with no record = Absent)
    const now = new Date();
    const IST_OFFSET = 330 * 60 * 1000;
    const istNow = new Date(now.getTime() + IST_OFFSET);
    istNow.setUTCHours(0, 0, 0, 0);
    const today = new Date(istNow.getTime() - IST_OFFSET); // IST Midnight
    const approvedLeaves = yield prisma_1.default.leaveRequest.findMany({
        where: {
            user_id: userId,
            status: 'APPROVED',
            start_date: { lte: endDate },
            end_date: { gte: startDate }
        }
    });
    let missingDays = 0;
    const scanEnd = endDate > today ? today : endDate;
    for (let d = new Date(startDate); d <= scanEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        const isSunday = d.getDay() === 0;
        const isHoliday = holidayDates.has(dateStr);
        const hasLeave = approvedLeaves.some(leave => {
            const leaveStart = new Date(leave.start_date);
            const leaveEnd = new Date(leave.end_date);
            leaveStart.setHours(0, 0, 0, 0);
            leaveEnd.setHours(23, 59, 59, 999);
            return d >= leaveStart && d <= leaveEnd;
        });
        if (!attendanceDates.has(dateStr) && !isSunday && !isHoliday && !hasLeave) {
            missingDays++;
        }
    }
    lopDays += missingDays;
    return lopDays;
});
exports.calculateAutoLOP = calculateAutoLOP;
const getSalaryDraft = (userId_1, month_1, year_1, asOfDate_1, ...args_1) => __awaiter(void 0, [userId_1, month_1, year_1, asOfDate_1, ...args_1], void 0, function* (userId, month, year, asOfDate, requestedType = 'MONTHLY') {
    // 1. Get Staff Profile
    const profile = yield prisma_1.default.staffProfile.findUnique({
        where: { user_id: userId },
        include: { user: true }
    });
    if (!profile)
        throw new Error("Staff profile not found");
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
    let calculationDate;
    let isProrated = false;
    // Determine 'Till Date' vs 'Monthly'
    if (String(requestedType).trim() === 'TILL_DATE') {
        if (asOfDate)
            calculationDate = new Date(asOfDate);
        else if (today.getMonth() === month - 1 && today.getFullYear() === year)
            calculationDate = new Date(today);
        else
            calculationDate = new Date(monthEnd);
        calculationDate.setHours(23, 59, 59, 999);
        isProrated = true;
    }
    else {
        // MONTHLY
        calculationDate = new Date(monthEnd);
        calculationDate.setHours(23, 59, 59, 999);
        isProrated = false;
    }
    // Ensure calculation date is within the requested month
    if (calculationDate > monthEnd)
        calculationDate = monthEnd;
    if (calculationDate < monthStart)
        calculationDate = monthStart;
    // 3. Calculate LOP (Always needed for deduction)
    let lopDays = 0;
    try {
        lopDays = yield (0, exports.calculateAutoLOP)(userId, month, year, calculationDate);
    }
    catch (error) {
        console.error("Failed to calculate Auto-LOP:", error);
    }
    // 4. Calculate Working Days in the ACTUAL period
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(calculationDate);
    // Fetch Holidays for the period
    const holidays = yield prisma_1.default.holiday.findMany({
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
        grossTotal = monthlyGrossComponents;
        dailyWage = monthlyGrossComponents / 30;
        totalWorkingDays = 30;
    }
    else {
        // Strategy B: Till Date
        dailyWage = monthlyGrossComponents / 30; // Strict Actual Days
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
    const existingSlip = yield prisma_1.default.payrollSlip.findFirst({
        where: {
            user_id: userId,
            run: { month, year } // Implicit join
        }
    });
    // 9. Check Ledgers for Advance
    let salaryAdvanceBalance = 0;
    try {
        const advanceLedger = yield prisma_1.default.ledger.findFirst({
            where: { entity_id: userId, entity_type: 'USER', head: { code: '1000' } }
        });
        if (advanceLedger && advanceLedger.balance > 0)
            salaryAdvanceBalance += advanceLedger.balance;
        let staffLedger = yield prisma_1.default.ledger.findFirst({
            where: { entity_id: userId, entity_type: 'USER', head: { code: '2000' } }
        });
        if (!staffLedger) {
            staffLedger = yield prisma_1.default.ledger.findFirst({
                where: { name: profile.user.full_name, head: { code: '2000' } }
            });
        }
        if (staffLedger && staffLedger.balance > 0)
            salaryAdvanceBalance += staffLedger.balance;
        const expenseLedger = yield prisma_1.default.ledger.findFirst({
            where: { entity_id: userId, head: { code: '6000' } }
        });
        if (expenseLedger && expenseLedger.balance > 0)
            salaryAdvanceBalance += expenseLedger.balance;
    }
    catch (error) {
        console.error("Failed to fetch ledger balances:", error);
    }
    if (existingSlip) {
        // Validate / Update Advance from Source of Truth (Ledger)
        const currentAdvance = salaryAdvanceBalance;
        // Correct Net Pay Formula: Gross Total (Fresh Calc) - Deductions
        const updatedNetPay = grossTotal - lopDeduction - currentAdvance - existingSlip.other_deductions;
        return Object.assign(Object.assign({}, existingSlip), { user: profile.user, department: profile.department, designation: profile.designation, isDraft: true, 
            // Override with Fresh Calc
            lop_days: lopDays, lop_deduction: lopDeduction, advance_salary: currentAdvance, total_working_days: totalWorkingDays, net_pay: Math.max(0, Math.round(updatedNetPay)), 
            // Gross Total from Fresh Calc
            gross_total: grossTotal, daily_wage: Math.round(dailyWage), 
            // Sync Fresh Components from Profile (Fix for Settings Sync)
            basic_salary: basic, hra: hra, conveyance_allowance: conveyance, accommodation_allowance: accommodation, allowances: allowances, incentives: incentives, 
            // Metadata
            calculation_date: calculationDate, days_in_period: daysInPeriod, is_prorated: isProrated, payroll_type: requestedType // Enforce requested type
         });
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
});
exports.getSalaryDraft = getSalaryDraft;
const getPayrollRunDetails = (month, year) => __awaiter(void 0, void 0, void 0, function* () {
    const run = yield prisma_1.default.payrollRun.findFirst({
        where: { month, year },
        include: {
            slips: {
                include: { user: true }
            }
        }
    });
    if (!run)
        return { slips: [], total_payout: 0, total_deductions: 0 };
    const slips = run.slips.map((s) => {
        var _a;
        return (Object.assign(Object.assign({}, s), { name: ((_a = s.user) === null || _a === void 0 ? void 0 : _a.full_name) || 'Unknown' }));
    });
    const total_payout = slips.reduce((sum, s) => sum + s.net_pay, 0);
    const total_deductions = slips.reduce((sum, s) => sum + s.lop_deduction + (s.advance_salary || 0) + (s.other_deductions || 0), 0);
    return {
        run,
        slips,
        total_payout,
        total_deductions
    };
});
exports.getPayrollRunDetails = getPayrollRunDetails;
const savePayrollSlip = (month, year, userId, data) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Get/Create Draft Run (using userId for legacy call compatibility or just data)
    let run = yield prisma_1.default.payrollRun.findFirst({ where: { month, year } });
    if (!run) {
        run = yield prisma_1.default.payrollRun.create({ data: { month, year, status: 'DRAFT', type: data.payroll_type || 'MONTHLY' } });
    }
    if (run.status === 'PAID')
        throw new Error("Payroll is locked.");
    // 3. Upsert Slip
    const existing = yield prisma_1.default.payrollSlip.findFirst({
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
        total_working_days: Number(data.total_working_days) || 30,
        net_pay: Number(data.net_pay),
        status: 'PENDING',
        payroll_type: data.payroll_type || 'MONTHLY',
        gross_total: Number(data.gross_total)
    };
    if (existing) {
        return prisma_1.default.payrollSlip.update({ where: { id: existing.id }, data: slipData });
    }
    else {
        return prisma_1.default.payrollSlip.create({ data: slipData });
    }
});
exports.savePayrollSlip = savePayrollSlip;
const confirmPayrollRun = (month, year) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const run = yield tx.payrollRun.findFirst({ where: { month, year } });
        if (!run)
            throw new Error("Run not found");
        // 1. Lock Run
        yield tx.payrollRun.update({
            where: { id: run.id },
            data: { status: 'PAID', processed_at: new Date() }
        });
        // 2. Post to Ledger (Detailed)
        const slips = yield tx.payrollSlip.findMany({ where: { payroll_run_id: run.id } });
        const totalPayout = slips.reduce((sum, s) => sum + s.net_pay, 0);
        const staffEntries = [];
        const advanceEntries = [];
        const salaryExpenseLedger = yield (0, service_1.ensureLedger)('INTERNAL', 'SALARY_EXPENSE', '6000');
        for (const slip of slips) {
            const staffLedger = yield (0, service_1.ensureLedger)('USER', slip.user_id, '2000'); // Liability
            staffEntries.push({
                ledger_id: staffLedger.id,
                credit: slip.net_pay,
                debit: 0
            });
            if (slip.advance_salary > 0) {
                const advanceLedger = yield (0, service_1.ensureLedger)('USER', slip.user_id, '1000', `Salary Advance - User ${slip.user_id}`);
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
        yield (0, service_1.createJournalEntry)(tx, {
            date: new Date(),
            description: `Payroll Run ${month}/${year}`,
            amount: balancedExpense,
            type: 'EXPENSE',
            created_by_id: 'SYSTEM',
            lines: journalLines
        });
        return { message: "Payroll Processed and Posted", totalPayout };
    }));
});
exports.confirmPayrollRun = confirmPayrollRun;
const getPayrollSlips = (userId, year, month) => __awaiter(void 0, void 0, void 0, function* () {
    const whereClause = {
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
    return prisma_1.default.payrollSlip.findMany({
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
});
exports.getPayrollSlips = getPayrollSlips;
const processIndividualSlip = (slipId) => __awaiter(void 0, void 0, void 0, function* () {
    const slipForUser = yield prisma_1.default.payrollSlip.findUnique({ where: { id: slipId } });
    if (!slipForUser)
        throw new Error("Slip not found");
    const salaryExpenseLedger = yield (0, service_1.ensureLedger)('INTERNAL', 'SALARY_EXPENSE', '6000', 'Salary Expense');
    const staffLedger = yield (0, service_1.ensureLedger)('USER', slipForUser.user_id, '2000');
    let bankLedger = yield prisma_1.default.ledger.findFirst({
        where: { name: { contains: 'Canara' } }
    });
    if (!bankLedger) {
        bankLedger = yield prisma_1.default.ledger.findFirst({
            where: { entity_type: 'BANK', status: 'ACTIVE' }
        });
    }
    if (!bankLedger) {
        bankLedger = yield (0, service_1.ensureLedger)('INTERNAL', 'MAIN_BANK', '1000', 'Main Bank A/C');
    }
    let advanceLedger = null;
    if (slipForUser.advance_salary > 0) {
        advanceLedger = yield (0, service_1.ensureLedger)('USER', slipForUser.user_id, '1000', `Salary Advance - User ${slipForUser.user_id}`);
    }
    return prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const slip = yield tx.payrollSlip.findUnique({
            where: { id: slipId },
            include: { run: true, user: true }
        });
        if (!slip)
            throw new Error("Slip not found");
        if (slip.status === 'PAID')
            throw new Error("Slip already paid");
        const monthName = new Date(0, slip.run.month - 1).toLocaleString('default', { month: 'short' });
        const periodStr = `${monthName} ${slip.run.year}`;
        let totalExpense = slip.net_pay;
        if (slip.advance_salary > 0)
            totalExpense += slip.advance_salary;
        const realAccrualLines = [
            { ledger_id: salaryExpenseLedger.id, debit: totalExpense, credit: 0 },
            { ledger_id: staffLedger.id, credit: slip.net_pay, debit: 0 }
        ];
        if (slip.advance_salary > 0 && advanceLedger) {
            realAccrualLines.push({ ledger_id: advanceLedger.id, credit: slip.advance_salary, debit: 0 });
        }
        yield (0, service_1.createJournalEntry)(tx, {
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
        yield (0, service_1.createJournalEntry)(tx, {
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
    }));
});
exports.processIndividualSlip = processIndividualSlip;
const rejectIndividualSlip = (slipId) => __awaiter(void 0, void 0, void 0, function* () {
    const slip = yield prisma_1.default.payrollSlip.findUnique({ where: { id: slipId } });
    if (!slip)
        throw new Error("Slip not found");
    if (slip.status === 'PAID')
        throw new Error("Cannot reject a paid slip");
    return prisma_1.default.payrollSlip.delete({ where: { id: slipId } });
});
exports.rejectIndividualSlip = rejectIndividualSlip;
