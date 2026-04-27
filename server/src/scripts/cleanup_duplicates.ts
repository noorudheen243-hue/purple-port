import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Cleaning up duplicate Unified Ledgers...");
    
    const masters = await prisma.ledgerMaster.findMany({
        orderBy: { createdAt: 'desc' }
    });

    const seen = new Set();
    let deletedCount = 0;

    for (const m of masters) {
        const key = `${m.entity_type}-${m.entity_id || m.ledger_name}`;
        if (seen.has(key)) {
            // Delete this duplicate
            // We must delete transactions and mappings first
            await prisma.unifiedTransaction.deleteMany({ where: { ledger_id: m.id } });
            await prisma.legacyLedgerMapping.deleteMany({ where: { new_ledger_id: m.id } });
            await prisma.ledgerMaster.delete({ where: { id: m.id } });
            deletedCount++;
        } else {
            seen.add(key);
        }
    }

    console.log(`Cleaned up ${deletedCount} duplicate ledgers.`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
