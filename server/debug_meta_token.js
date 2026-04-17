const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkToken() {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: { key: { in: ['META_APP_ID', 'META_APP_SECRET'] } }
        });
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        const appId = settingsMap['META_APP_ID'];
        const appSecret = settingsMap['META_APP_SECRET'];

        // Get the latest meta token for the specific ad account act_657980315809710
        const account = await prisma.marketingAccount.findFirst({
            where: { externalAccountId: '657980315809710', platform: 'meta' },
            include: { metaToken: true }
        });

        if (!account || !account.metaToken) {
            console.log('No account/token found for 657980315809710');
            return;
        }

        const token = account.metaToken.access_token;
        console.log('Token found for account:', account.externalAccountId);

        // Debug the token with Graph API
        const debugRes = await axios.get(`https://graph.facebook.com/debug_token`, {
            params: {
                input_token: token,
                access_token: `${appId}|${appSecret}` // App Access Token
            }
        });

        console.log('Token Debug Info:', JSON.stringify(debugRes.data.data, null, 2));

        // List all accessible ad accounts
        console.log('Listing all accessible AD accounts for this token...');
        const accountsRes = await axios.get(`https://graph.facebook.com/v21.0/me/adaccounts`, {
            params: {
                access_token: token,
                fields: 'id,name,account_id,account_status,permitted_tasks'
            }
        });

        console.log('Accessible Accounts:', JSON.stringify(accountsRes.data.data, null, 2));

        const targetId = '657980315809710';
        const formattedTargetId = targetId.startsWith('act_') ? targetId : `act_${targetId}`;
        const targetAccount = accountsRes.data.data.find(a => a.id === formattedTargetId || a.account_id === targetId);

        if (targetAccount) {
            console.log('Target manual account FOUND in /me/adaccounts list.');
            console.log('Permitted Tasks:', targetAccount.permitted_tasks);
        } else {
            console.log('Target manual account NOT FOUND in /me/adaccounts list.');
        }

        // Test permission on the specific ad account directly again
        try {
            const testRes = await axios.get(`https://graph.facebook.com/v21.0/${formattedTargetId}`, {
                params: {
                    access_token: token,
                    fields: 'name,account_status'
                }
            });
            console.log('Direct API Test Success for', formattedTargetId, testRes.data);
        } catch (e) {
            console.log('Direct API Test Error for', formattedTargetId, e.response?.data?.error || e.message);
        }

    } catch (e) {
        console.error('Error debugging token:', e.message);
    }
}

checkToken();
