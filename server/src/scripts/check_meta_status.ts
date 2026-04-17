
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function checkMetaStatus() {
  console.log('--- Checking Meta App Diagnostic Status ---');
  
  try {
    // 1. Load credentials from DB
    const settings = await (prisma as any).systemSetting.findMany({
      where: { key: { in: ['META_APP_ID', 'META_APP_SECRET'] } }
    });

    const settingsMap = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const dbAppId = settingsMap['META_APP_ID'];
    const envAppId = process.env.META_APP_ID;
    const appId = dbAppId || envAppId;

    const dbAppSecret = settingsMap['META_APP_SECRET'];
    const envAppSecret = process.env.META_APP_SECRET;
    const appSecret = dbAppSecret || envAppSecret;

    console.log(`- App ID Source: ${dbAppId ? 'Database' : 'Environment'}`);
    if (!appId || appId.includes('placeholder')) {
      console.error('❌ Error: META_APP_ID is not configured or is a placeholder.');
      return;
    }

    console.log(`- App ID: ${appId}`);
    console.log(`- App Secret: ${appSecret ? '********' : '❌ MISSING'}`);

    // 2. Fetch App Status from Graph API
    // We use an App Access Token (client_id|client_secret)
    const appAccessToken = `${appId}|${appSecret}`;
    
    try {
      console.log(`- Fetching status for App ID ${appId} via Graph API...`);
      const response = await axios.get(`https://graph.facebook.com/v21.0/${appId}`, {
        params: {
          access_token: appAccessToken,
          fields: 'name,link,category'
        }
      });

      console.log('✅ API Response Success!');
      console.log(JSON.stringify(response.data, null, 2));
      
      console.log('\n--- Status Summary ---');
      console.log(`Name: ${response.data.name}`);
      console.log(`Link: ${response.data.link}`);
      
      if (!response.data.privacy_url) {
        console.warn('⚠️ Warning: Privacy Policy URL is missing. Meta requires this for it to be Live.');
      } else {
        console.log(`Privacy URL: ${response.data.privacy_url}`);
      }

    } catch (apiError: any) {
      console.error('❌ Meta API Error:');
      const fbError = apiError.response?.data?.error;
      if (fbError) {
        console.error(`  Code: ${fbError.code}`);
        console.error(`  Message: ${fbError.message}`);
        console.error(`  Type: ${fbError.type}`);
        
        if (fbError.message.includes('updating additional details')) {
            console.log('\n🚨 ACTION REQUIRED:');
            console.log('This matches the error the user reported. Log in to developers.facebook.com and look for:');
            console.log('1. Data Use Checkup alerts.');
            console.log('2. App Review requests for requested permissions (ads_management, etc).');
            console.log('3. Ensure the app is NOT in "Development" mode if use is external.');
        }
      } else {
        console.error(`  ${apiError.message}`);
      }
    }

  } catch (error: any) {
    console.error('Fatal Error during diagnostic:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMetaStatus();
