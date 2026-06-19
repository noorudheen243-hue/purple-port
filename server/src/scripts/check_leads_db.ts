import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== DB Leads & Campaigns Check ===');
    
    const clients = await prisma.client.findMany();
    console.log('Clients count:', clients.length);
    for (const c of clients) {
        console.log(`- Client: ${c.name} (${c.id})`);
    }

    const integrations = await prisma.marketingAccount.findMany({
        include: { metaToken: true }
    });
    console.log('\nIntegrations count:', integrations.length);
    for (const i of integrations) {
        console.log(`- Integration: ID=${i.id}, clientId=${i.clientId}, extAcc=${i.externalAccountId}, platform=${i.platform}, hasToken=${!!i.metaToken || !!i.accessToken}`);
    }

    const campaigns = await (prisma as any).marketingCampaign.findMany();
    console.log('\nCampaigns count:', campaigns.length);
    const campaignsByStatus: Record<string, number> = {};
    for (const c of campaigns) {
        campaignsByStatus[c.status || 'NO_STATUS'] = (campaignsByStatus[c.status || 'NO_STATUS'] || 0) + 1;
    }
    console.log('Campaigns by Status:', campaignsByStatus);
    
    if (campaigns.length > 0) {
        console.log('Sample Campaigns (First 5):');
        for (const c of campaigns.slice(0, 5)) {
            console.log(`  * ${c.name} (ID: ${c.id}, ExtID: ${c.externalCampaignId}, Status: ${c.status}, ClientID: ${c.clientId})`);
        }
    }

    const leadsCount = await prisma.lead.count();
    console.log('\nTotal Leads in DB:', leadsCount);

    const leadsBySource = await prisma.lead.groupBy({
        by: ['source'],
        _count: true
    });
    console.log('Leads by Source:', leadsBySource);

    const firstLeads = await prisma.lead.findMany({
        take: 5,
        orderBy: { date: 'desc' }
    });
    console.log('\nFirst 5 Leads (newest first):');
    for (const l of firstLeads) {
        console.log(`  * Lead: ${l.name} (${l.phone || l.email}), source=${l.source}, campaign=${l.campaign_name}, date=${l.date}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
