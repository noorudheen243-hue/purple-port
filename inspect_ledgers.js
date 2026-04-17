const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectLedgers() {
    const ledgers = await prisma.ledger.findMany({
        include: { head: true }
    });
    console.log("Total Ledgers:", ledgers.length);
    
    const userLedgers = ledgers.filter(l => l.entity_type === 'USER');
    console.log("User Ledgers:", userLedgers.length);
    
    // Check for users with multiple ledgers
    const userMap = {};
    userLedgers.forEach(l => {
        if (!userMap[l.entity_id]) userMap[l.entity_id] = [];
        userMap[l.entity_id].push({ name: l.name, head: l.head.code, balance: l.balance });
    });
    
    Object.entries(userMap).forEach(([userId, ledgers]) => {
        if (ledgers.length > 1) {
            console.log(`User ${userId} has ${ledgers.length} ledgers:`, ledgers);
        } else {
            // console.log(`User ${userId} has 1 ledger:`, ledgers[0]);
        }
    });

    // Check for "6000" head ledgers for users
    const userExpenseLedgers = userLedgers.filter(l => l.head.code === '6000');
    console.log("User Expense (6000) Ledgers with non-zero balance:", userExpenseLedgers.filter(l => l.balance !== 0).length);
    if (userExpenseLedgers.length > 0) {
        console.log("Sample User Expense Ledger:", userExpenseLedgers[0]);
    }
    
    await prisma.$disconnect();
}

inspectLedgers();
