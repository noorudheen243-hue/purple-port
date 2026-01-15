
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Searching for Client 'Bravos'...");
    // Find Client (try name or brand_name if updated or company_name)
    // The exact field name depends on schema, let's try finding by partial name
    const clients = await prisma.client.findMany({
        where: {
            name: { contains: 'Bravos' }
        }
    });

    if (clients.length === 0) {
        console.log("No client found with name containing 'Bravos'");
        return;
    }

    const bravos = clients[0];
    console.log("Found Client:", bravos.id, bravos.name);

    console.log("Searching for Ledger linked to this Client...");
    const linkedLedger = await prisma.ledger.findFirst({
        where: {
            entity_type: 'CLIENT',
            entity_id: bravos.id
        }
    });

    if (linkedLedger) {
        console.log("Found Linked Ledger:", linkedLedger.id, linkedLedger.name, "Balance:", linkedLedger.balance);
    } else {
        console.log("CRITICAL: No Ledger found with entity_id =", bravos.id);

        // Try finding by name
        console.log("Searching for Ledger by Name 'Bravos'...");
        const nameLedger = await prisma.ledger.findFirst({
            where: {
                name: { contains: 'Bravos' }
            }
        });

        if (nameLedger) {
            console.log("Found Unlinked Ledger by Name:", nameLedger.id, nameLedger.name, "EntityID:", nameLedger.entity_id);
            console.log("Attempting to Fix Link...");

            await prisma.ledger.update({
                where: { id: nameLedger.id },
                data: {
                    entity_type: 'CLIENT',
                    entity_id: bravos.id
                }
            });
            console.log("Link Fixed!");
        } else {
            console.log("No Ledger found by name either.");
        }
    }

    // Check Transactions
    if (linkedLedger) {
        const txs = await prisma.journalEntry.findMany({
            where: {
                lines: {
                    some: {
                        ledger_id: linkedLedger.id
                    }
                }
            },
            include: { lines: true }
        });
        console.log(`Found ${txs.length} transactions for this ledger.`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
