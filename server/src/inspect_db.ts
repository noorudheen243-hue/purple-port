
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const adAccountId = '616308347710249';
  console.log(`Checking database for Ad Account: ${adAccountId}`);

  const accounts = await (prisma as any).marketingAccount.findMany({
    where: {
      externalAccountId: {
        contains: adAccountId
      }
    },
    include: {
      client: true,
      metaToken: true
    }
  });

  console.log('Found Marketing Accounts:');
  console.log(JSON.stringify(accounts, null, 2));

  if (accounts.length > 0) {
    const clientId = accounts[0].clientId;
    console.log(`Checking campaigns for Client ID: ${clientId}`);
    const campaigns = await (prisma as any).marketingCampaign.findMany({
      where: { clientId, platform: 'meta' }
    });
    console.log(`Found ${campaigns.length} Meta campaigns`);
    console.log(JSON.stringify(campaigns.map((c: any) => ({ id: c.id, name: c.name, externalId: c.externalCampaignId })), null, 2));
  } else {
    // Search by client name if account not found
    console.log('Searching for client "Interman Learning"');
    const clients = await (prisma as any).client.findMany({
      where: {
        name: {
          contains: 'Interman Learning',
          // mode: 'insensitive' // SQLite might not support this directly in all Prisma versions
        }
      }
    });
    console.log('Found Clients:');
    console.log(JSON.stringify(clients, null, 2));
    
    if (clients.length > 0) {
      const clientId = clients[0].id;
      const clientAccounts = await (prisma as any).marketingAccount.findMany({
        where: { clientId }
      });
      console.log(`Found ${clientAccounts.length} marketing accounts for this client`);
      console.log(JSON.stringify(clientAccounts, null, 2));
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
