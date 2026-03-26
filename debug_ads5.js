const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';
async function run() {
    const acc = await prisma.marketingAccount.findFirst({ where: { platform: 'meta' } });
    const formattedAccountId = acc.externalAccountId.startsWith('act_') ? acc.externalAccountId : 'act_' + acc.externalAccountId;
    try {
        const res = await axios.get(META_GRAPH_URL + '/' + formattedAccountId + '/ads', {
            params: { access_token: acc.accessToken, fields: 'id,creative{object_story_spec,asset_feed_spec,effective_object_story_id,call_to_action_type}' }
        });
        const ads = res.data.data;
        for (const ad of ads) {
            console.log('\nAD ID:', ad.id);
            const str = JSON.stringify(ad.creative);
            const match = str.match(/(?:lead_gen_form_id)["']?\s*:\s*["']?(\d+)["']?/i);
            if (match) {
                console.log('FOUND FORM:', match[1]);
                try {
                    const lRes = await axios.get(META_GRAPH_URL + '/' + match[1] + '/leads', { params: { access_token: acc.accessToken, fields: 'id,created_time,field_data' } });
                    console.log('FOUND LEADS FOR THIS FORM:', lRes.data.data.length);
                    if (lRes.data.data.length > 0) {
                        console.log('Got leads!', JSON.parse(lRes.data.data[0].field_data[0] || '{}'));
                    }
                } catch (e) { console.log('Err fetching leads:', e.response ? e.response.data : e.message); }
            } else {
                console.log('No form ID in this ad.');
            }
        }
    } catch (e) { console.log('Err fetching ads:', e.message); }
}
run();
