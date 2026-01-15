
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Checking for Duplicate 'Noorudheen' Ledgers ---");
    const ledgers = await prisma.ledger.findMany({
        where: { name: { contains: 'Noorudheen' } },
        include: { head: true }
    });

    ledgers.forEach(l => {
        console.log(`[${l.head.code}] ${l.name} (Type: ${l.entity_type}, ID: ${l.entity_id}) - Bal: ${l.balance}`);
    });
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
