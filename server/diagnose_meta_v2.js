
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
const prisma = new PrismaClient();
const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

async function diagnose(clientId) {
  try {
    console.log(`--- Meta Sync Diagnosis for Client: ${clientId} ---`);
    const account = await prisma.marketingAccount.findFirst({
      where: { clientId, platform: 'meta' },
      include: { metaToken: true, client: true }
    });

    if (!account) {
      console.log('❌ ERROR: No marketing account found for this client ID.');
      return;
    }

    console.log(`Client: ${account.client?.name}`);
    const rawId = account.externalAccountId || '';
    const trimmedId = rawId.trim();
    const formattedId = trimmedId.startsWith('act_') ? trimmedId : `act_${trimmedId}`;
    
    console.log(`Stored ID: "${rawId}"`);
    console.log(`Cleaned ID: "${trimmedId}"`);
    console.log(`Formatted ID: "${formattedId}"`);

    const token = account.metaToken?.access_token || account.accessToken;
    if (!token) {
      console.log('❌ ERROR: No access token found.');
      return;
    }
    console.log(`Token Present: Yes (Starts with: ${token.substring(0, 10)}...)`);

    console.log('\n--- Calling Meta Graph API ---');
    try {
      const url = `${META_GRAPH_URL}/${formattedId}/campaigns`;
      console.log(`GET ${url}`);
      const res = await axios.get(url, {
        params: {
          access_token: token,
          fields: 'id,name,status,effective_status'
        }
      });

      const campaigns = res.data.data || [];
      console.log(`✅ SUCCESS: Fetched ${campaigns.length} campaigns.`);
      if (campaigns.length > 0) {
        console.log('Sample Campaigns:');
        campaigns.slice(0, 5).forEach(c => console.log(` - [${c.id}] ${c.name} (${c.status})`));
      } else {
        console.log('⚠️ WARNING: API returned successfully but campaign list is EMPTY.');
      }
    } catch (e) {
      console.log('❌ API CALL FAILED');
      if (e.response) {
        console.log(`Status: ${e.response.status}`);
        console.log('Error Data:', JSON.stringify(e.response.data, null, 2));
        
        const subCode = e.response.data?.error?.error_subcode;
        if (subCode === 1341012) console.log('TIP: This usually means the account is disabled or missing permissions.');
        if (e.response.data?.error?.message?.includes('Unsupported get request')) {
            console.log('TIP: This often happens if the ID is wrong (e.g. using Business ID instead of Ad Account ID).');
        }
      } else {
        console.log(`Error Message: ${e.message}`);
      }
    }

  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

const targetId = process.argv[2];
if (!targetId) {
    console.log('Usage: node diagnose_meta_v2.js <clientId>');
} else {
    diagnose(targetId);
}
