import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
    const clientId = '1f4f0934-9915-4fd9-b085-87e71208cbe8';
    console.log(`=== Fetching Facebook Pages for Client: ${clientId} ===`);

    const account = await prisma.marketingAccount.findFirst({
        where: { clientId, platform: 'meta' },
        include: { metaToken: true }
    });

    if (!account) {
        console.error('No Meta account found for this client!');
        return;
    }

    const token = account.metaToken?.access_token || account.accessToken;
    if (!token) {
        console.error('No access token found for the account!');
        return;
    }

    try {
        console.log('Fetching user pages via /me/accounts...');
        const response = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
            params: { access_token: token, limit: 100 }
        });
        const pages = response.data.data || [];
        console.log(`Found ${pages.length} pages:`);
        for (const p of pages) {
            console.log(`- Page: ${p.name} (ID: ${p.id}), Tasks: ${JSON.stringify(p.tasks)}`);
        }
    } catch (e: any) {
        console.error('Error fetching pages:', e.response?.data?.error || e.message);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
