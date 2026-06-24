const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function checkAdPage() {
    const tokenRecord = await prisma.metaToken.findFirst({
        where: { account_name: 'Noorudheen Pallithodi' }
    });
    
    if (!tokenRecord) {
        console.log('Noorudheen Pallithodi token not found.');
        return;
    }
    
    const accessToken = tokenRecord.access_token;
    const url = 'https://graph.facebook.com/v19.0';
    const adId = '120217299744100514';
    
    try {
        console.log(`Querying creative details for Ad ${adId}...`);
        const adRes = await axios.get(`${url}/107761235744852`, {
            params: {
                access_token: accessToken,
                fields: 'id,name'
            }
        });
        console.log('Page Details:', JSON.stringify(adRes.data, null, 2));
    } catch (e) {
        console.error('Error fetching ad details:', e.response?.data || e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdPage().catch(console.error);
