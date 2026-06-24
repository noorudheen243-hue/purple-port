const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

async function main() {
    const clientId = 'db6df8c3-0ec8-4b17-8071-e39746b8be35';
    const accountId = '1017260952339227';

    console.log(`[Test] Finding marketing account for client ${clientId} / account ${accountId}`);
    const account = await prisma.marketingAccount.findFirst({
        where: { externalAccountId: accountId, platform: 'meta' },
        include: { metaToken: true }
    });

    if (!account) {
        console.error("Account not found in DB!");
        return;
    }

    const accessToken = account.metaToken ? account.metaToken.access_token : account.accessToken;
    console.log(`[Test] Access Token: ${accessToken ? accessToken.substring(0, 15) + '...' : 'null'}`);

    console.log("[Test] Querying marketingCampaigns for client in DB...");
    const campaigns = await prisma.marketingCampaign.findMany({
        where: { clientId, platform: 'meta' }
    });
    console.log(`[Test] Found ${campaigns.length} campaigns in DB for client ${clientId}`);

    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    console.log(`[Test] Fetching ads from Facebook for ${formattedAccountId}...`);

    let ads = [];
    try {
        const adsRes = await axios.get(`${META_GRAPH_URL}/${formattedAccountId}/ads`, {
            params: {
                access_token: accessToken,
                fields: 'id,campaign_id,name',
                limit: 500
            }
        });
        ads = adsRes.data?.data || [];
        console.log(`[Test] Successfully fetched ${ads.length} ads from Meta.`);
        if (ads.length > 0) {
            console.log("[Test] Sample Ads:", JSON.stringify(ads.slice(0, 5), null, 2));
        }
    } catch (err) {
        console.error("[Test] Error fetching ads from Meta:", err.response ? err.response.data : err.message);
        return;
    }

    // Group ads by campaign ID
    const adIdsByCampaign = {};
    for (const ad of ads) {
        if (ad.campaign_id) {
            if (!adIdsByCampaign[ad.campaign_id]) adIdsByCampaign[ad.campaign_id] = [];
            adIdsByCampaign[ad.campaign_id].push(ad.id);
        }
    }

    console.log("[Test] Matching ads to DB campaigns...");
    let matchedCampaignsCount = 0;
    let totalMatchedAds = 0;
    for (const campaign of campaigns) {
        const extCampId = campaign.externalCampaignId;
        if (extCampId && adIdsByCampaign[extCampId]) {
            matchedCampaignsCount++;
            totalMatchedAds += adIdsByCampaign[extCampId].length;
            console.log(`  - Match: DB Campaign "${campaign.name}" (${extCampId}) has ${adIdsByCampaign[extCampId].length} ads.`);
        }
    }
    console.log(`[Test] Matched ${matchedCampaignsCount} campaigns out of ${campaigns.length} in DB. Total matched ads: ${totalMatchedAds}`);

    // Let's sample a few ads from matched campaigns and try to query their leads
    let checkedAdsCount = 0;
    for (const campaign of campaigns) {
        const extCampId = campaign.externalCampaignId;
        if (extCampId && adIdsByCampaign[extCampId]) {
            const adIds = adIdsByCampaign[extCampId];
            for (const adId of adIds) {
                if (checkedAdsCount >= 10) break;
                checkedAdsCount++;
                console.log(`[Test] Querying leads for Ad ${adId} (Campaign: ${campaign.name})...`);
                try {
                    const leadsRes = await axios.get(`${META_GRAPH_URL}/${adId}/leads`, {
                        params: {
                            access_token: accessToken,
                            fields: 'id,created_time,field_data,form_id',
                            limit: 50
                        }
                    });
                    const leads = leadsRes.data?.data || [];
                    console.log(`  - Ad ${adId}: found ${leads.length} leads.`);
                    if (leads.length > 0) {
                        console.log(`    Lead sample:`, JSON.stringify(leads[0], null, 2));
                    }
                } catch (err) {
                    console.error(`  - Error fetching leads for Ad ${adId}:`, err.response ? err.response.data : err.message);
                }
            }
        }
        if (checkedAdsCount >= 10) break;
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
