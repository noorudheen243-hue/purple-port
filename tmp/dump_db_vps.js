const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const clients = await prisma.client.findMany();
  console.log('CLIENTS_START');
  console.log(JSON.stringify(clients));
  console.log('CLIENTS_END');
  
  const accounts = await prisma.marketingAccount.findMany({
    where: { platform: 'meta' }
  });
  console.log('ACCOUNTS_START');
  console.log(JSON.stringify(accounts));
  console.log('ACCOUNTS_END');
  
  await prisma.$disconnect();
}
main();
