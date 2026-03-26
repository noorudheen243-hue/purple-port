const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

async function run() {
    const acc = await prisma.marketingAccount.findFirst({ where: { platform: 'meta' } });
    const formattedAccountId = acc.externalAccountId.startsWith('act_') ? acc.externalAccountId : 'act_' + acc.externalAccountId;

    try {
        console.log('--- Checking Campaign Insights Actions ---');
        const res = await axios.get(`${META_GRAPH_URL}/${formattedAccountId}/insights`, {
            params: {
                access_token: acc.accessToken,
                fields: 'actions,action_values',
                level: 'campaign',
                date_preset: 'this_year'
            }
        });

        const data = res.data.data || [];
        for (const item of data) {
            console.log('Actions:', JSON.stringify(item.actions, null, 2));
        }

    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}
run().finally(() => process.exit(0));
