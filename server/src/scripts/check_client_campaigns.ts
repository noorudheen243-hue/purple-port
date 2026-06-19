import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clientId = '1f4f0934-9915-4fd9-b085-87e71208cbe8';
    console.log(`=== Client: ${clientId} ===`);

    const campaigns = await (prisma as any).marketingCampaign.findMany({
        where: { clientId }
    });

    console.log(`Campaigns count: ${campaigns.length}`);
    const byStatus: Record<string, number> = {};
    const byPlatform: Record<string, number> = {};
    for (const c of campaigns) {
        byStatus[c.status || 'null'] = (byStatus[c.status || 'null'] || 0) + 1;
        byPlatform[c.platform || 'null'] = (byPlatform[c.platform || 'null'] || 0) + 1;
    }
    console.log('Campaigns by status:', byStatus);
    console.log('Campaigns by platform:', byPlatform);

    const activeMetaCampaigns = campaigns.filter((c: any) => c.platform === 'meta' && c.status === 'ACTIVE');
    console.log(`Active Meta Campaigns: ${activeMetaCampaigns.length}`);
    if (activeMetaCampaigns.length > 0) {
        console.log('First 5 Active Meta Campaigns:');
        for (const c of activeMetaCampaigns.slice(0, 5)) {
            console.log(`  * ID: ${c.id}, ExtID: ${c.externalCampaignId}, Name: ${c.name}`);
        }
    } else {
        console.log('No active Meta Campaigns found! What are the statuses of the Meta Campaigns?');
        const metaCampaigns = campaigns.filter((c: any) => c.platform === 'meta');
        console.log(`Total Meta Campaigns: ${metaCampaigns.length}`);
        for (const c of metaCampaigns.slice(0, 10)) {
            console.log(`  * ID: ${c.id}, ExtID: ${c.externalCampaignId}, Name: ${c.name}, Status: ${c.status}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
