const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function checkTokens() {
    console.log('--- Fetching MetaTokens from DB ---');
    const tokens = await prisma.metaToken.findMany();
    if (tokens.length === 0) {
        console.log('No MetaTokens found.');
        return;
    }

    for (const token of tokens) {
        console.log(`\nProfile: ${token.account_name} (${token.meta_user_id})`);
        const url = 'https://graph.facebook.com/v19.0';
        const accessToken = token.access_token;

        // 1. Check token info & permissions
        try {
            console.log('  1. Checking token permissions (/me/permissions)...');
            const permRes = await axios.get(`${url}/me/permissions`, { params: { access_token: accessToken } });
            console.log('     Permissions granted:');
            permRes.data.data.forEach(p => {
                console.log(`       - ${p.permission}: ${p.status}`);
            });
        } catch (err) {
            console.log('     Failed to fetch permissions:', err.response?.data || err.message);
        }

        // 2. Check accounts/pages
        try {
            console.log('  2. Fetching connected pages (/me/accounts)...');
            const pagesRes = await axios.get(`${url}/me/accounts`, { params: { access_token: accessToken } });
            const pages = pagesRes.data.data || [];
            console.log(`     Found ${pages.length} pages:`);
            pages.forEach(p => {
                console.log(`       * ${p.name} (ID: ${p.id}) - Has Access Token: ${!!p.access_token}`);
            });
        } catch (err) {
            console.log('     Failed to fetch pages:', err.response?.data || err.message);
        }
    }
}

checkTokens().then(() => prisma.$disconnect()).catch(console.error);
