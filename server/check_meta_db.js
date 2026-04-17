
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkMetaAccounts() {
  try {
    const accounts = await prisma.marketingAccount.findMany({
      where: { platform: 'meta' },
      include: { client: true }
    });
    console.log('--- Meta Marketing Accounts ---');
    accounts.forEach(acc => {
      console.log(`Client: ${acc.client?.name} (${acc.clientId})`);
      console.log(`External ID: ${acc.externalAccountId}`);
      console.log(`Token Exist: ${!!acc.accessToken}`);
      console.log('----------------------------');
    });

    const tokens = await prisma.metaToken.findMany();
    console.log('\n--- Meta Tokens (Global Profiles) ---');
    tokens.forEach(t => {
      console.log(`Name: ${t.account_name}`);
      console.log(`User ID: ${t.user_id}`);
      console.log(`Active: ${t.isActive}`);
      console.log('----------------------------');
    });

  } catch (error) {
    console.error('Error checking DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMetaAccounts();
