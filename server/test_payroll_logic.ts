
import { getSalaryDraft } from './src/modules/payroll/service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPayroll() {
    try {
        // 1. Get a test user (Staff)
        const staff = await prisma.staffProfile.findFirst({
            include: { user: true }
        });

        if (!staff) {
            console.log("No staff found to test");
            return;
        }

        const userId = staff.user_id;
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();

        console.log(`Testing for User: ${staff.user.full_name} (${userId})`);

        // CLEANUP
        const runs = await prisma.payrollRun.findMany({ where: { month, year } });
        for (const run of runs) {
            await prisma.payrollSlip.deleteMany({ where: { payroll_run_id: run.id, user_id: userId } });
        }
        console.log("Cleaned up existing slips.");

        // Test Monthly
        console.log("\n--- TEST: MONTHLY ---");
        const monthlyDraft = await getSalaryDraft(userId, month, year, undefined, 'MONTHLY');
        console.log(`Gross Total: ${monthlyDraft.gross_total}`);
        console.log(`Daily Wage: ${monthlyDraft.daily_wage}`);
        console.log(`Working Days: ${monthlyDraft.total_working_days}`);
        console.log(`Payroll Type: ${monthlyDraft.payroll_type}`);

        // Test Till Date
        console.log("\n--- TEST: TILL DATE ---");
        const tillDateDraft = await getSalaryDraft(userId, month, year, undefined, 'TILL_DATE');
        console.log(`Gross Total: ${tillDateDraft.gross_total}`);
        console.log(`Daily Wage: ${tillDateDraft.daily_wage}`);
        console.log(`Working Days: ${tillDateDraft.total_working_days}`);
        console.log(`Payroll Type: ${tillDateDraft.payroll_type}`);
        console.log(`Calculation Date: ${tillDateDraft.calculation_date}`);

    } catch (error) {
        console.error("Test Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testPayroll();
