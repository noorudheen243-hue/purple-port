import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const l = await prisma.ledgerMaster.findFirst({ where: { ledger_name: 'Master Expense Account' } });
    console.log(l?.id);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
