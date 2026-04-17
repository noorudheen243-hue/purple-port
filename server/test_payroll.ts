import prisma from './src/utils/prisma';
import { calculateAutoLOP, getSalaryDraft } from './src/modules/payroll/service';

async function testLOP() {
    const userId = 'a0ab8140-69aa-41e8-ba49-b580c3175628'; // A valid user from the DB
    const month = 3;
    const year = 2026;
    
    console.log("Testing LOP for User:", userId);
    
    try {
        const lopDays = await calculateAutoLOP(userId, month, year);
        console.log("Calculated LOP Days:", lopDays);
        
        const draft = await getSalaryDraft(userId, month, year);
        console.log("Salary Draft:", {
            name: draft.name,
            lop_days: draft.lop_days,
            lop_deduction: draft.lop_deduction,
            advance_salary: draft.advance_salary,
            net_pay: draft.net_pay
        });
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

testLOP();
