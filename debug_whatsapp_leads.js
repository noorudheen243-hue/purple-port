const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';
const PAGE_ID = '936952939492449';

async function run() {
    const acc = await prisma.marketingAccount.findFirst({ where: { platform: 'meta' } });

    console.log('--- Checking Forms for Page:', PAGE_ID, '---');
    try {
        const formsRes = await axios.get(`${META_GRAPH_URL}/${PAGE_ID}/leadgen_forms`, {
            params: { access_token: acc.accessToken, fields: 'id,name,leads_count,status' }
        });
        const forms = formsRes.data.data || [];
        console.log('Found', forms.length, 'forms.');

        for (const form of forms) {
            console.log(`\nForm: ${form.name} (${form.id}) - Leads: ${form.leads_count}`);
            if (form.leads_count > 0 || true) {
                try {
                    const leadsRes = await axios.get(`${META_GRAPH_URL}/${form.id}/leads`, {
                        params: { access_token: acc.accessToken, fields: 'id,created_time,field_data' }
                    });
                    const leads = leadsRes.data.data || [];
                    console.log(`Fetched ${leads.length} leads for form ${form.id}`);
                    if (leads.length > 0) {
                        console.log('SAMPLE LEAD DATA:', JSON.stringify(leads[0], null, 2));
                    }
                } catch (e) {
                    console.error(`Error fetching leads for form ${form.id}:`, e.response?.data || e.message);
                }
            }
        }
    } catch (e) {
        console.error('Error fetching forms:', e.response?.data || e.message);
    }
}
run().finally(() => process.exit(0));
