const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.systemSetting.upsert({
    where: { key: 'UNIFIED_LEDGER_ENABLED' },
    update: { value: 'false' }, // Default to false
    create: { key: 'UNIFIED_LEDGER_ENABLED', value: 'false' }
  });
  console.log('Feature flag UNIFIED_LEDGER_ENABLED set to false');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
