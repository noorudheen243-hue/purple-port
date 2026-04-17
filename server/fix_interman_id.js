const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.marketingAccount.updateMany({
    where: { 
      clientId: '1f4f0934-9915-4fd9-b085-87e71208cbe8',
      platform: 'meta'
    },
    data: {
      externalAccountId: '616308347710249'
    }
  });
  console.log('--- DATABASE UPDATED ---');
  console.log(`Updated ${result.count} records.`);
  
  const updated = await prisma.marketingAccount.findFirst({
    where: { clientId: '1f4f0934-9915-4fd9-b085-87e71208cbe8', platform: 'meta' }
  });
  console.log(JSON.stringify(updated, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
