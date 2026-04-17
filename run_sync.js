const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Mock ensureLedger or use real one
// Since the code is already changed, calling it will use the new logic.

async function runSync() {
    const { syncEntityLedgers } = require('./src/modules/accounting/service');
    const result = await syncEntityLedgers();
    console.log("Sync Result:", result);
    await prisma.$disconnect();
}

runSync();
