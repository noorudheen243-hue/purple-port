import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
    const clientId = '1f4f0934-9915-4fd9-b085-87e71208cbe8';
    console.log(`=== Token Permissions Check for Client: ${clientId} ===`);

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

    console.log('Access Token (first 15 chars):', token.substring(0, 15) + '...');

    try {
        const response = await axios.get('https://graph.facebook.com/v19.0/me/permissions', {
            params: { access_token: token }
        });
        console.log('Permissions:', JSON.stringify(response.data.data, null, 2));
    } catch (e: any) {
        console.error('Error fetching permissions:', e.response?.data?.error || e.message);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
