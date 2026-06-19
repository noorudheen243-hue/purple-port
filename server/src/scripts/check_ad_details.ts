import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
    const clientId = '1f4f0934-9915-4fd9-b085-87e71208cbe8';
    console.log(`=== Fetching Ad Details for Client: ${clientId} ===`);

    const account = await prisma.marketingAccount.findFirst({
        where: { clientId, platform: 'meta' },
        include: { metaToken: true }
    });

    if (!account) {
        console.error('No Meta account found!');
        return;
    }

    const token = account.metaToken?.access_token || account.accessToken;
    if (!token) {
        console.error('No access token found!');
        return;
    }

    const adIds = [
        '120247553955580504',
        '120208386463200414',
        '120242000910720504'
    ];

    for (const adId of adIds) {
        try {
            console.log(`\nFetching ad: ${adId}...`);
            const res = await axios.get(`https://graph.facebook.com/v19.0/${adId}`, {
                params: {
                    access_token: token,
                    fields: 'id,name,campaign_id,campaign{name},creative'
                }
            });
            console.log('Ad Details:', JSON.stringify(res.data, null, 2));
            
            // If creative contains id, fetch creative details
            if (res.data.creative?.id) {
                const creativeId = res.data.creative.id;
                console.log(`Fetching creative details for creative ${creativeId}...`);
                const creativeRes = await axios.get(`https://graph.facebook.com/v19.0/${creativeId}`, {
                    params: {
                        access_token: token,
                        fields: 'id,name,actor_id,object_id,object_type,object_story_id'
                    }
                });
                console.log('Creative Details:', JSON.stringify(creativeRes.data, null, 2));
            }
        } catch (e: any) {
            console.error(`Error fetching ad ${adId}:`, e.response?.data?.error || e.message);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
