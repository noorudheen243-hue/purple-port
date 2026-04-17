
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    const accounts = await prisma.marketingAccount.findMany({
      where: { platform: 'meta' }
    });
    console.log(`Checking ${accounts.length} Meta accounts...`);
    
    let updatedCount = 0;
    for (const acc of accounts) {
      if (acc.externalAccountId && acc.externalAccountId !== acc.externalAccountId.trim()) {
        const trimmed = acc.externalAccountId.trim();
        console.log(`Trimming for client ${acc.clientId}: "${acc.externalAccountId}" -> "${trimmed}"`);
        await prisma.marketingAccount.update({
          where: { id: acc.id },
          data: { externalAccountId: trimmed }
        });
        updatedCount++;
      }
    }
    console.log(`Cleanup complete. Updated ${updatedCount} accounts.`);
  } catch (err) {
    console.error('Cleanup error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
