
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const ledgers = await prisma.ledger.findMany({
        include: { head: true }
    });
    const mappings = await prisma.legacyLedgerMapping.findMany();
    
    console.log("--- LEDGERS ---");
    ledgers.forEach(l => {
        const mapping = mappings.find(m => m.old_income_ledger_id === l.id || m.old_expense_ledger_id === l.id);
        console.log(`ID: ${l.id}, Name: ${l.name}, Type: ${l.entity_type}, Mapped: ${!!mapping}`);
    });
}

check().then(() => process.exit(0));
