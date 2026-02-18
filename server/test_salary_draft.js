/**
 * Manual Test Script: Salary Draft Calculation
 * 
 * Run this on the VPS to verify salary data is correct:
 *   node test_salary_draft.js
 * 
 * Or run locally:
 *   node test_salary_draft.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

async function testSalaryDraft() {
    console.log("=== Salary Draft Manual Test ===\n");

    // 1. List all staff with their salary data
    console.log("--- All Staff & Salary Settings ---");
    const allStaff = await prisma.staffProfile.findMany({
        include: { user: { select: { full_name: true, id: true } } },
        orderBy: { staff_number: 'asc' }
    });

    for (const s of allStaff) {
        const total = (s.base_salary || 0) + (s.hra || 0) + (s.conveyance_allowance || 0) + (s.accommodation_allowance || 0) + (s.allowances || 0);
        console.log(`\n[${s.staff_number}] ${s.user.full_name}`);
        console.log(`  User ID    : ${s.user_id}`);
        console.log(`  Basic      : ₹${s.base_salary || 0}`);
        console.log(`  HRA        : ₹${s.hra || 0}`);
        console.log(`  Conveyance : ₹${s.conveyance_allowance || 0}`);
        console.log(`  Accomm.    : ₹${s.accommodation_allowance || 0}`);
        console.log(`  Allowances : ₹${s.allowances || 0}`);
        console.log(`  TOTAL/Month: ₹${total}`);
        console.log(`  Per Day    : ₹${(total / 30).toFixed(2)}`);
    }

    // 2. Check for existing draft slips (Feb 2026)
    console.log("\n\n--- Existing Draft Slips (Feb 2026) ---");
    const month = 2, year = 2026;
    const run = await prisma.payrollRun.findFirst({ where: { month, year } });
    if (!run) {
        console.log("No payroll run found for Feb 2026.");
    } else {
        const slips = await prisma.payrollSlip.findMany({
            where: { run_id: run.id },
            include: { user: { select: { full_name: true } } }
        });
        for (const slip of slips) {
            console.log(`\n[${slip.user.full_name}]`);
            console.log(`  basic_salary: ₹${slip.basic_salary}`);
            console.log(`  hra         : ₹${slip.hra}`);
            console.log(`  gross_total : ₹${slip.gross_total}`);
            console.log(`  lop_days    : ${slip.lop_days}`);
            console.log(`  net_pay     : ₹${slip.net_pay}`);
        }
    }

    // 3. Check attendance for current month
    console.log("\n\n--- Attendance Records (Feb 2026) ---");
    const startDate = new Date(2026, 1, 1);
    const endDate = new Date(2026, 2, 0);
    const attendance = await prisma.attendanceRecord.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { user: { select: { full_name: true } } },
        orderBy: { date: 'asc' }
    });
    const grouped = {};
    for (const a of attendance) {
        const name = a.user.full_name;
        if (!grouped[name]) grouped[name] = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, WFH: 0, other: 0 };
        if (grouped[name][a.status] !== undefined) grouped[name][a.status]++;
        else grouped[name].other++;
    }
    for (const [name, counts] of Object.entries(grouped)) {
        console.log(`\n${name}: Present=${counts.PRESENT}, Absent=${counts.ABSENT}, HalfDay=${counts.HALF_DAY}, WFH=${counts.WFH}`);
    }

    await prisma.$disconnect();
    console.log("\n=== Test Complete ===");
}

testSalaryDraft().catch(e => {
    console.error("FATAL ERROR:", e);
    prisma.$disconnect();
});
