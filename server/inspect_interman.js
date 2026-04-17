const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const account = await prisma.marketingAccount.findFirst({
    where: { 
      clientId: '1f4f0934-9915-4fd9-b085-87e71208cbe8',
      platform: 'meta'
    },
    include: {
      metaToken: true
    }
  });
  console.log('--- DATABASE RESULT ---');
  console.log(JSON.stringify(account, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
