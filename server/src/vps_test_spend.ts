import prisma from './utils/prisma';

async function checkSpend() {
    try {
        const accounts = await prisma.marketingAccount.findMany();
        console.log("Found accounts:", accounts.map(a => a.externalAccountId).join(', '));
        
        let account = accounts.find(a => a.externalAccountId.includes('1017260952339227'));
        if (!account) {
            console.log("Account 1017260952339227 not found manually either.");
            return;
        }

        const activeCampaigns = await prisma.marketingCampaign.findMany({
            where: { 
                clientId: account.clientId,
                platform: 'meta',
                status: 'ACTIVE'
            }
        });

        console.log(`Found ${activeCampaigns.length} campaigns with status=ACTIVE in DB.`);

        let totalSpend = 0;
        for (const camp of activeCampaigns) {
            const metrics = await prisma.marketingMetric.findMany({
                where: { campaignId: camp.id }
            });
            const spend = metrics.reduce((sum: number, m: any) => sum + (m.spend || 0), 0);
            totalSpend += spend;
            
            if (spend > 0) {
               console.log(`- Campaign: ${camp.name} | Status: ${camp.status} | Spend: ${spend}`);
            }
        }

        console.log(`Total Spend for ACTIVE campaigns: ${totalSpend}`);
        
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}
checkSpend();
