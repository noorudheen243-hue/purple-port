import { getSalaryDraft } from './src/modules/payroll/service';
import prisma from './src/utils/prisma';

async function verifyBasil() {
    const userId = '0c94b346-9a55-48f2-8d0b-fd9f9f3edd0c';
    console.log("Verifying Salary Draft for Basil (ID: 0c94b346-9a55-48f2-8d0b-fd9f9f3edd0c)");
    
    try {
        const draft = await getSalaryDraft(userId, 3, 2026);
        console.log("Basil's Draft Result:", {
            name: draft.name,
            advance_salary: draft.advance_salary, // Should be 0, not 16000
            lop_days: draft.lop_days,
            net_pay: draft.net_pay
        });
        
        if (draft.advance_salary === 16000) {
            console.error("FAIL: 16000 Expense balance still being included in Advance!");
        } else if (draft.advance_salary === 0) {
            console.log("SUCCESS: 16000 Expense balance correctly ignored.");
        }
    } catch (e) {
        console.error("Verification failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyBasil();
