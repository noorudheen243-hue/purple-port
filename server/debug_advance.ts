
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Debugging Transactions for Advance ---");

    const entries = await prisma.journalEntry.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { lines: { include: { ledger: true } } }
    });

    if (entries.length === 0) {
        console.log("No transactions found.");
    } else {
        entries.forEach(e => {
            console.log(`\nNote: ${e.description} | Amount: ${e.amount}`);
            e.lines.forEach(l => {
                console.log(`  - [${l.ledger.name}] Dr: ${l.debit}, Cr: ${l.credit}`);
            });
        });
    }

    // Also check for specific user ledgers again
    const user = await prisma.user.findFirst({ where: { full_name: { contains: 'Noorudheen' } } });
    if (user) {
        const userLedgers = await prisma.ledger.findMany({ where: { entity_id: user.id } });
        console.log(`\nUser Ledgers for ${user.full_name}: ${userLedgers.length}`);
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
