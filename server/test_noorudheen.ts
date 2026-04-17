import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { getSalaryDraft } from './src/modules/payroll/service';

async function testNoorudheen() {
    const user = await prisma.user.findFirst({
        where: { full_name: 'Noorudheen' }
    });
    
    if (!user) {
        console.log("Noorudheen not found");
        return;
    }
    
    console.log("Testing Noorudheen:", user.id);
    
    const draft = await getSalaryDraft(user.id, 3, 2026);
    console.log("Noorudheen Draft:", {
        name: draft.name,
        lop_days: draft.lop_days,
        advance_salary: draft.advance_salary,
        net_pay: draft.net_pay
    });
    
    await prisma.$disconnect();
}

testNoorudheen();
