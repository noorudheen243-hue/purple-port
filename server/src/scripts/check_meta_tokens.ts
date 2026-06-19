import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Meta Tokens in DB ===');
    const tokens = await (prisma as any).metaToken.findMany({
        include: {
            marketingAccounts: {
                select: {
                    id: true,
                    clientId: true,
                    externalAccountId: true,
                    client: {
                        select: { name: true }
                    }
                }
            }
        }
    });

    for (const t of tokens) {
        console.log(`- Token ID: ${t.id}`);
        console.log(`  Account Name: ${t.account_name}`);
        console.log(`  Meta User ID: ${t.meta_user_id}`);
        console.log(`  Expires At: ${t.expires_at}`);
        console.log(`  Linked Accounts:`);
        for (const ma of t.marketingAccounts) {
            console.log(`    * Client: ${ma.client?.name} (${ma.clientId}), ExtAcc: ${ma.externalAccountId}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
