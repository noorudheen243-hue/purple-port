const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const drBasilId = 'db6df8c3-0ec8-4b17-8071-e39746b8be35';
    const naadanId = '1dca8a40-5cf5-4b66-b256-0e5e2c1d6cae';

    const shihabTokenRecord = await prisma.metaToken.findUnique({
        where: { id: 'token-919640203803366-0f602110-d76e-4f21-8bcf-c71959dd4015' }
    });

    const noorTokenRecord = await prisma.metaToken.findUnique({
        where: { id: 'token-2072270786963487-0f602110-d76e-4f21-8bcf-c71959dd4015' }
    });

    // Fix Dr Basil
    await prisma.marketingAccount.upsert({
        where: { id: (await prisma.marketingAccount.findFirst({ where: { clientId: drBasilId, platform: 'meta' } }))?.id || 'new-basil' },
        create: {
            clientId: drBasilId,
            platform: 'meta',
            externalAccountId: '1017260952339227',
            metaTokenId: shihabTokenRecord.id,
            accessToken: shihabTokenRecord.access_token
        },
        update: {
            externalAccountId: '1017260952339227',
            metaTokenId: shihabTokenRecord.id,
            accessToken: shihabTokenRecord.access_token
        }
    });

    // Fix Naadan
    await prisma.marketingAccount.upsert({
        where: { id: (await prisma.marketingAccount.findFirst({ where: { clientId: naadanId, platform: 'meta' } }))?.id || 'new-naadan' },
        create: {
            clientId: naadanId,
            platform: 'meta',
            externalAccountId: '550148554403865',
            metaTokenId: noorTokenRecord.id,
            accessToken: noorTokenRecord.access_token
        },
        update: {
            externalAccountId: '550148554403865',
            metaTokenId: noorTokenRecord.id,
            accessToken: noorTokenRecord.access_token
        }
    });

    console.log('Successfully manual linked Dr Basil and Naadan Food Stuff!');
    process.exit(0);
}

fix();
