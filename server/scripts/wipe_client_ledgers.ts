
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const wipeClientLedgers = async () => {
    console.log("Starting Client Ledger Wipe...");
    try {
        // 1. Find all ledgers linked to CLIENTs or USERs
        const clientLedgers = await prisma.ledger.findMany({
            where: { entity_type: { in: ['CLIENT', 'USER'] } },
            select: { id: true, name: true, entity_type: true }
        });

        console.log(`Found ${clientLedgers.length} client ledgers.`);

        if (clientLedgers.length === 0) {
            console.log("No ledgers to delete.");
            return;
        }

        const ledgerIds = clientLedgers.map(l => l.id);

        // 2. Delete Journal Entries/Lines associated with these ledgers
        // We need to be careful: deleting a line forces the entry to be unbalanced? 
        // Or we delete the whole entry if it involves these ledgers?
        // Since we are creating a "clean slate", we should delete any transaction involving these ledgers.

        // Find Entries that have lines for these ledgers
        const involvedEntries = await prisma.journalEntry.findMany({
            where: {
                lines: {
                    some: {
                        ledger_id: { in: ledgerIds }
                    }
                }
            },
            select: { id: true }
        });

        const entryIds = involvedEntries.map(e => e.id);
        console.log(`Found ${entryIds.length} related transactions to delete.`);

        // Delete Journal Lines for these entries (All lines, not just client ones, to remove the full transaction)
        if (entryIds.length > 0) {
            await prisma.journalLine.deleteMany({
                where: { entry_id: { in: entryIds } }
            });

            // Delete Entries
            await prisma.journalEntry.deleteMany({
                where: { id: { in: entryIds } }
            });
            console.log("Deleted related transactions.");
        }

        // 3. Delete Ledgers
        const deleted = await prisma.ledger.deleteMany({
            where: { id: { in: ledgerIds } }
        });

        console.log(`Successfully deleted ${deleted.count} Client/Staff Ledgers.`);

    } catch (error) {
        console.error("Error wiping client ledgers:", error);
    } finally {
        await prisma.$disconnect();
    }
};

wipeClientLedgers();
