import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLedgers() {
    const transactions = await prisma.unifiedTransaction.findMany({
        where: { category: 'Meta Recharge' },
        include: { ledger: true },
        take: 10
    });

    const ledgers = transactions.map(t => ({
        name: t.ledger.ledger_name,
        type: t.ledger.entity_type
    }));

    console.log(JSON.stringify(ledgers, null, 2));
    await prisma.$disconnect();
}

checkLedgers();
