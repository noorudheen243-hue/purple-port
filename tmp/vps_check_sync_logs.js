const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    try {
        console.log('--- RECENT SYNC LOGS ---');
        const logs = await p.marketingSyncLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        console.log(JSON.stringify(logs, null, 2));

        console.log('\n--- ACCOUNT STATUS ---');
        const accounts = await p.marketingAccount.findMany({
            include: { client: { select: { client_code: true, name: true } } }
        });
        console.log(JSON.stringify(accounts.map(a => ({
            id: a.id,
            client: a.client.name,
            code: a.client.client_code,
            platform: a.platform,
            extId: a.externalAccountId,
            hasToken: !!a.accessToken || !!a.metaTokenId
        })), null, 2));

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await p.$disconnect();
    }
}
check();
