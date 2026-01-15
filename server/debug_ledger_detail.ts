
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Inspecting 'Noorudheen' Ledger ---");
    const ledger = await prisma.ledger.findFirst({
        where: { name: 'Noorudheen' },
        include: { head: true }
    });

    if (ledger) {
        console.log(`Found: ${ledger.name}`);
        console.log(`ID: ${ledger.id}`);
        console.log(`Entity Type: ${ledger.entity_type}`); // Likely null or wrong
        console.log(`Entity ID: ${ledger.entity_id}`);
        console.log(`Head: ${ledger.head.name} (${ledger.head.code})`);
        console.log(`Balance: ${ledger.balance}`);
    } else {
        console.log("Ledger 'Noorudheen' not found by exact name.");
        // Try contains
        const similar = await prisma.ledger.findFirst({ where: { name: { contains: 'Noorudheen' } } });
        if (similar) console.log(`Found similar: ${similar.name}`);
    }
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
