const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findNormalUserWithExpense() {
    const ledgers = await prisma.ledger.findMany({
        where: { 
            entity_type: 'USER',
            head: { code: '6000' },
            balance: { not: 0 }
        },
        include: { head: true }
    });
    
    for (const l of ledgers) {
        // Find user by name (since entity_id might be null in old records)
        const user = await prisma.user.findFirst({
            where: { full_name: l.name },
            include: { staffProfile: true }
        });
        
        if (user && user.staffProfile && !['QIX0001', 'QIX0002'].includes(user.staffProfile.staff_number)) {
            console.log("FOUND_USER:", { id: user.id, name: user.full_name, staff_number: user.staffProfile.staff_number, expense_balance: l.balance });
            break;
        }
    }
    
    await prisma.$disconnect();
}

findNormalUserWithExpense();
