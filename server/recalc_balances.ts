
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Recalculating Ledger Balances ---");

    await prisma.ledger.updateMany({ data: { balance: 0.0 } });

    const lines = await prisma.journalLine.findMany();
    console.log(`Processing ${lines.length} journal lines...`);

    const movements: Record<string, number> = {};

    for (const line of lines) {
        if (!movements[line.ledger_id]) movements[line.ledger_id] = 0;
        movements[line.ledger_id] += (line.debit - line.credit);
    }

    for (const [id, balance] of Object.entries(movements)) {
        await prisma.ledger.update({
            where: { id },
            data: { balance }
        });
        console.log(`Updated Ledger ${id.substring(0, 8)}...: ${balance}`);
    }

    console.log("Recalculation Complete.");
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
