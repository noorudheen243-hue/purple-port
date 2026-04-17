const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMapping() {
    try {
        console.log("--- Scanning Marketing Accounts ---");
        const accounts = await prisma.marketingAccount.findMany({
            include: { metaToken: true }
        });
        console.log("Total Marketing Accounts:", accounts.length);
        
        for (const acc of accounts) {
            const client = await prisma.client.findUnique({ where: { id: acc.clientId } });
            console.log(`- Platform: ${acc.platform}, ID: ${acc.externalAccountId}, Client: ${client ? client.name : 'Unknown'} (${acc.clientId})`);
        }

        console.log("\n--- Scanning Dr Basil specifically ---");
        const basilClient = await prisma.client.findFirst({
            where: { name: { contains: 'Basil' } }
        });
        if (basilClient) {
            console.log(`Found Client: ${basilClient.name} (${basilClient.id})`);
            const basilAcc = await prisma.marketingAccount.findFirst({
                where: { clientId: basilClient.id, platform: 'meta' }
            });
            console.log(`Mapped Meta Account: ${basilAcc ? basilAcc.externalAccountId : 'NOT MAPPED'}`);
        } else {
            console.log("Dr Basil client not found in DB.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkMapping();
