const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { format, subDays } = require('date-fns');

const p = new PrismaClient();
const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

async function debug() {
    const accountId = '657980315809710';
    console.log(`--- DEBUGGING META FETCH FOR ACCOUNT: ${accountId} ---`);

    try {
        const account = await p.marketingAccount.findFirst({
            where: { externalAccountId: accountId, platform: 'meta' },
            include: { metaToken: true }
        });

        if (!account) {
            console.error('Account not found in DB');
            return;
        }

        const token = account.metaToken?.access_token || account.accessToken;
        if (!token) {
            console.error('No token found for account');
            return;
        }

        console.log('Token Prefix:', token.substring(0, 10) + '...');

        const formattedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
        const today = new Date();
        const last7Days = JSON.stringify({
            since: format(subDays(today, 7), 'yyyy-MM-dd'),
            until: format(today, 'yyyy-MM-dd')
        });

        console.log('Requesting insights for last 7 days:', last7Days);

        const url = `${META_GRAPH_URL}/${formattedId}/insights`;
        const params = {
            access_token: token,
            level: 'campaign',
            time_range: last7Days,
            time_increment: 1,
            fields: 'campaign_id,campaign_name,impressions,reach,clicks,spend,actions'
        };

        try {
            const response = await axios.get(url, { params });
            console.log('RESPONSE STATUS:', response.status);
            console.log('DATA ROWS:', response.data.data?.length || 0);
            if (response.data.data?.length > 0) {
                console.log('SAMPLE ROW:', JSON.stringify(response.data.data[0], null, 2));
            } else {
                console.log('NO DATA RETURNED. This usually means no spend/activity in the selected time range or permissions issue.');
                console.log('FULL RESPONSE:', JSON.stringify(response.data, null, 2));
            }
        } catch (apiErr) {
            console.error('META API ERROR:', apiErr.response?.data || apiErr.message);
        }

    } catch (e) {
        console.error('DAEMON ERROR:', e.message);
    } finally {
        await p.$disconnect();
    }
}

debug();
