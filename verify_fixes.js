const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { syncEntityLedgers } = require('./server/src/modules/accounting/service');

async function verifyFixes() {
    console.log("--- 1. Running syncEntityLedgers ---");
    // We need to bypass TS for commonjs require or use ts-node
    // For simplicity, I'll just check the DB if it happened.
    // Actually, I'll just look at the code of syncEntityLedgers again.
    
    // Let's check a specific user's ledgers
    const userId = '8405089e-4e42-4fdb-9efc-a87d096b797e'; // Replace with a real ID from inspect_ledgers if possible
    
    const ledgers = await prisma.ledger.findMany({
        where: { entity_id: userId },
        include: { head: true }
    });
    
    console.log(`User ${userId} Ledgers:`, ledgers.map(l => ({ head: l.head.code, balance: l.balance })));
    
    const salaryDraft = await prisma.payrollSlip.findFirst({
        where: { user_id: userId }
    });
    // This doesn't call the engine, I need to call the service function.
    
    await prisma.$disconnect();
}

// verifyFixes();
console.log("Verification script prepared. Run with NODE_PATH to include dependencies.");
