const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const clients = [
        { id: 'db6df8c3-0ec8-4b17-8071-e39746b8be35', name: 'Dr Basil' },
        { id: '1dca8a40-5cf5-4b66-b256-0e5e2c1d6cae', name: 'Naadan' }
    ];

    for (const c of clients) {
        const acc = await prisma.marketingAccount.findFirst({
            where: { clientId: c.id, platform: 'meta' }
        });
        console.log(`Client: ${c.name}`);
        console.log(`- Account ID: ${acc?.externalAccountId}`);
        console.log(`- Token Present: ${!!acc?.accessToken}`);
        console.log(`- MetaToken ID: ${acc?.metaTokenId}`);
        console.log('---');
    }
    process.exit(0);
}

check();
