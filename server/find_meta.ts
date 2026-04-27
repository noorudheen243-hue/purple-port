
import prisma from './utils/prisma';

async function findMetaTransactions() {
    const transactions = await prisma.journalEntry.findMany({
        where: {
            OR: [
                { description: { contains: 'meta' } },
                { description: { contains: 'recharge' } }
            ]
        },
        include: {
            lines: {
                include: { ledger: true }
            }
        }
    });
    
    console.log(`Found ${transactions.length} transactions:`);
    transactions.forEach(tx => {
        console.log(`--- ${tx.date} | ${tx.description} | ${tx.amount} ---`);
        tx.lines.forEach(l => {
            console.log(`  ${l.ledger.name} (${l.ledger.entity_type}) | Dr: ${l.debit} | Cr: ${l.credit}`);
        });
    });
    
    await prisma.$disconnect();
}

findMetaTransactions();
