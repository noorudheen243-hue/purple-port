const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tokenRecord = await prisma.metaToken.findFirst({
    where: { meta_user_id: '2072270786963487' }
  });

  if (!tokenRecord) {
    console.log('No token found for this user.');
    return;
  }

  console.log(`Checking accounts for Meta User: ${tokenRecord.account_name} (${tokenRecord.meta_user_id})`);
  
  try {
    const res = await axios.get(`https://graph.facebook.com/v21.0/me/adaccounts`, {
      params: {
        access_token: tokenRecord.access_token,
        fields: 'name,account_id,account_status'
      }
    });
    console.log('--- AVAILABLE AD ACCOUNTS ---');
    console.log(JSON.stringify(res.data.data, null, 2));
    
    const targetAccountId = '657980315809710';
    const hasAccess = res.data.data.find(a => a.account_id === targetAccountId || a.id === `act_${targetAccountId}`);
    console.log(`\nTarget Account ID: ${targetAccountId}`);
    console.log(`Has Access? ${hasAccess ? 'YES' : 'NO'}`);
    
  } catch (err) {
    console.error('Error fetching accounts:', err.response?.data || err.message);
  }
}

main().finally(() => prisma.$disconnect());
