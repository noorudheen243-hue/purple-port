const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function toggle(enabled) {
  const value = enabled ? 'true' : 'false';
  await prisma.systemSetting.upsert({
    where: { key: 'UNIFIED_LEDGER_ENABLED' },
    update: { value },
    create: { key: 'UNIFIED_LEDGER_ENABLED', value }
  });
  console.log(`Unified Ledger System is now ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

const arg = process.argv[2];
if (arg === 'on') toggle(true);
else if (arg === 'off') toggle(false);
else console.log('Usage: node toggle_unified.js [on|off]');
