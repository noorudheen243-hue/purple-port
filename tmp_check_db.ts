import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching Meta Marketing Accounts...");
    const accounts = await prisma.marketingAccount.findMany({
        where: { platform: 'meta' }
    });
    
    console.log(accounts);
    
    console.log("\nFetching Clients...");
    const clients = await prisma.client.findMany();
    // Match clients with accounts
    for (const acc of accounts) {
        const client = clients.find(c => c.id === acc.clientId);
        console.log(`Account ${acc.externalAccountId} -> Client: ${client?.name || 'Unknown'}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
