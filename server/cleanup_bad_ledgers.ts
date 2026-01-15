
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Cleaning up bad ledgers...");
    const badLedgers = await prisma.ledger.findMany({
        where: { name: { contains: 'undefined' } }
    });

    console.log(`Found ${badLedgers.length} bad ledgers.`);

    for (const ledger of badLedgers) {
        console.log(`Deleting ledger: ${ledger.name} (${ledger.id})`);

        // Delete transactions involving this ledger
        const lines = await prisma.journalLine.findMany({ where: { ledger_id: ledger.id } });
        for (const line of lines) {
            // Delete the ENTRY (and al lines) for this bad transaction
            const entryId = line.entry_id;
            // Delete lines first
            await prisma.journalLine.deleteMany({ where: { entry_id: entryId } });
            // Delete entry
            await prisma.journalEntry.delete({ where: { id: entryId } });
        }

        // Delete Ledger
        await prisma.ledger.delete({ where: { id: ledger.id } });
    }
    console.log("Cleanup complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
