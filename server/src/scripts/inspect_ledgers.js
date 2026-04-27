const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ledgers = await prisma.ledger.findMany({
    include: { head: true }
  });
  console.log(JSON.stringify(ledgers, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
