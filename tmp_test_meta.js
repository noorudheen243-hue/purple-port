const axios = require('axios');
const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
    // Get Dr Basil account
    const acct = await p.marketingAccount.findFirst({
        where: { externalAccountId: '1017260952339227', platform: 'meta' },
        include: { metaToken: true }
    });

    if (!acct) { console.log("Account not found!"); return; }

    const token = acct.metaToken?.access_token || acct.accessToken;
    if (!token) { console.log("No token!"); return; }

    const accountId = 'act_1017260952339227';
    console.log(`Testing with token: ${token.substring(0, 25)}...`);
    console.log(`MetaToken: ${acct.metaTokenId}`);

    // Test 1: Can we fetch this account info?
    try {
        const info = await axios.get(`https://graph.facebook.com/v21.0/${accountId}`, {
            params: { access_token: token, fields: 'id,name,account_status,currency' }
        });
        console.log("\n[ACCOUNT INFO SUCCESS]:", JSON.stringify(info.data, null, 2));
    } catch (err) {
        console.error("[ACCOUNT INFO ERROR]:", JSON.stringify(err.response?.data, null, 2));
    }

    // Test 2: Campaigns
    try {
        const camps = await axios.get(`https://graph.facebook.com/v21.0/${accountId}/campaigns`, {
            params: { access_token: token, fields: 'id,name,effective_status', limit: 5 }
        });
        console.log(`\n[CAMPAIGNS SUCCESS]: ${camps.data.data?.length} campaigns returned`);
    } catch (err) {
        console.error("[CAMPAIGNS ERROR]:", JSON.stringify(err.response?.data, null, 2));
    }

    // Test 3: Insights (this is what fails with 400)
    try {
        const insights = await axios.get(`https://graph.facebook.com/v21.0/${accountId}/insights`, {
            params: {
                access_token: token,
                level: 'campaign',
                date_preset: 'this_year',
                time_increment: 1,
                fields: 'campaign_id,campaign_name,impressions,reach,clicks,spend',
                limit: 3
            }
        });
        console.log(`\n[INSIGHTS SUCCESS]: ${insights.data.data?.length} rows`);
        console.log("Sample:", JSON.stringify(insights.data.data?.[0], null, 2));
    } catch (err) {
        console.error("[INSIGHTS ERROR] Status:", err.response?.status);
        console.error("[INSIGHTS ERROR] Body:", JSON.stringify(err.response?.data, null, 2));
    }
}
main().finally(() => p.$disconnect());
