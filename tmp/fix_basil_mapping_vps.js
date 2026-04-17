const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- SCANNING FOR CLIENT: DR BASIL ---");
    const basilClient = await prisma.client.findFirst({
        where: { name: { contains: 'Basil' } }
    });
    
    if (basilClient) {
        console.log(`FOUND: ${basilClient.name} (ID: ${basilClient.id})`);
        const accounts = await prisma.marketingAccount.findMany({
            where: { clientId: basilClient.id }
        });
        console.log(`MARKETING ACCOUNTS: ${accounts.length}`);
        for (const acc of accounts) {
            console.log(`- ${acc.platform}: ${acc.externalAccountId}`);
        }
        
        // If not mapped, map it (User provided 1017260952339227)
        const targetId = '1017260952339227';
        const existing = accounts.find(a => a.externalAccountId === targetId || a.externalAccountId === `act_${targetId}`);
        if (!existing) {
             console.log(`MAPPING NEW META ACCOUNT: ${targetId}`);
             // Check if we have any Meta token globally first
             const globalToken = await prisma.metaToken.findFirst({ where: { isActive: true } });
             if (globalToken) {
                 await prisma.marketingAccount.create({
                     data: {
                         clientId: basilClient.id,
                         platform: 'meta',
                         externalAccountId: `act_${targetId}`,
                         metaTokenId: globalToken.id
                     }
                 });
                 console.log("SUCCESSFULLY MAPPED.");
             } else {
                 console.log("NO ACTIVE META TOKEN FOUND. LOGGING IN MIGHT BE REQUIRED FIRST.");
             }
        } else {
            console.log("ACCOUNT ALREADY MAPPED.");
        }
    } else {
        console.log("DR BASIL CLIENT NOT FOUND.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
