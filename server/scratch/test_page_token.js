const axios = require('axios');

async function testPageToken() {
    // User Access Token for Noorudheen Pallithodi
    const userToken = 'EAAC6Ppe7ZAsYBO1tZCGVp6j1yP24jG27xGepc3vPqKkR1g6GJZCebZBpxW5g1LdDq2ZAbm7yvR8nUjFZAqF3ZAupF668iR020z9c6xY9qZC2jZB022687y21ZCr55yZB035y0994j85ZC297341258671683yZB'; 
    // Wait, let's not hardcode a token in code. Instead, let's query it from the DB in the script!
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const tokenRecord = await prisma.metaToken.findFirst({
        where: { account_name: 'Noorudheen Pallithodi' }
    });
    
    if (!tokenRecord) {
        console.log('Noorudheen Pallithodi token not found in DB.');
        return;
    }
    
    const accessToken = tokenRecord.access_token;
    const url = 'https://graph.facebook.com/v19.0';
    
    try {
        console.log('1. Fetching Page Access Token from /me/accounts...');
        const accountsRes = await axios.get(`${url}/me/accounts`, { params: { access_token: accessToken } });
        const pages = accountsRes.data.data || [];
        
        const page = pages.find(p => p.id === '936952939492449'); // Koomen Brand Studio Page ID
        if (!page) {
            console.log('Page Koomen Brand Studio (936952939492449) not found in user accounts.');
            return;
        }
        
        const pageToken = page.access_token;
        console.log('   Found page access token:', pageToken ? 'YES' : 'NO');
        
        // Let's test fetching leads with the Page Access Token
        const adId = '120217299744100514'; // One of the failed ad IDs
        console.log(`2. Attempting to fetch leads for Ad ${adId} using USER access token...`);
        try {
            const userLeads = await axios.get(`${url}/${adId}/leads`, { params: { access_token: accessToken } });
            console.log('   Success with USER token! Leads count:', userLeads.data.data?.length);
        } catch (err) {
            console.log('   Failed with USER token:', err.response?.data?.error?.message || err.message);
        }
        
        console.log(`3. Attempting to fetch leads for Ad ${adId} using PAGE access token...`);
        try {
            const pageLeads = await axios.get(`${url}/${adId}/leads`, { params: { access_token: pageToken } });
            console.log('   Success with PAGE token! Leads count:', pageLeads.data.data?.length);
            if (pageLeads.data.data) {
                console.log('   Lead sample:', JSON.stringify(pageLeads.data.data[0]));
            }
        } catch (err) {
            console.log('   Failed with PAGE token:', err.response?.data?.error?.message || err.message);
        }
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    } finally {
        await prisma.$disconnect();
    }
}

testPageToken().catch(console.error);
