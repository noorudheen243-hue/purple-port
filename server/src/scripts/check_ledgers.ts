import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const count = await prisma.ledger.count();
    console.log('Total Legacy Ledgers:', count);
    const ledgers = await prisma.ledger.findMany({
        take: 10,
        select: { name: true, entity_type: true }
    });
    console.log('Sample Ledgers:', ledgers);
}
main().finally(() => prisma.$disconnect());
