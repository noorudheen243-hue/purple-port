
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function checkBothPossibleApps() {
  const ids = ['574636601633519', '1707906853528856'];
  const secret = '672403621ff68d15be3d18cfa2e537e8';

  console.log('--- Multi-App Diagnostic ---');
  for (const id of ids) {
    try {
      console.log(`Checking App ID: ${id}...`);
      const response = await axios.get(`https://graph.facebook.com/v21.0/${id}`, {
        params: {
          access_token: `${id}|${secret}`,
          fields: 'name,link,category'
        }
      });
      console.log(`✅ App ${id} is reachable:`, response.data.name);
    } catch (e: any) {
      console.error(`❌ App ${id} Status Error:`);
      const fbError = e.response?.data?.error;
      if (fbError) {
        console.error(`  Code: ${fbError.code}`);
        console.error(`  Message: ${fbError.message}`);
      } else {
          console.error(`  Error: ${e.message}`);
      }
    }
    console.log('---');
  }
}

checkBothPossibleApps();
