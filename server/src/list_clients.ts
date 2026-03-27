
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Listing all clients:');
  const clients = await (prisma as any).client.findMany({
    select: { id: true, name: true }
  });
  console.log(JSON.stringify(clients, null, 2));

  console.log('Listing all Meta tokens:');
  const tokens = await (prisma as any).metaToken.findMany();
  console.log(JSON.stringify(tokens, null, 2));

  console.log('Listing all marketing accounts:');
  const accounts = await (prisma as any).marketingAccount.findMany({
    include: { client: { select: { name: true } } }
  });
  console.log(JSON.stringify(accounts, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
