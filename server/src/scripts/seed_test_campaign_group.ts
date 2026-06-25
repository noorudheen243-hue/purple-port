import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== Seeding Test Data ===");
    
    // Find existing client
    const client = await prisma.client.findFirstOrThrow();
    const clientId = client.id;
    console.log(`Using Client: ${client.name} (${clientId})`);

    // Create a MarketingGroup
    const group = await prisma.marketingGroup.create({
        data: {
            name: "Test Campaign Group X",
            client_id: clientId
        }
    });
    console.log(`Created MarketingGroup: ${group.name} (${group.id})`);

    // Create a MarketingCampaign assigned to the group
    const campaign = await prisma.marketingCampaign.create({
        data: {
            clientId: clientId,
            platform: "meta",
            externalCampaignId: "ext_camp_12345",
            name: "Test Meta Campaign 1",
            status: "ACTIVE",
            group_id: group.id
        }
    });
    console.log(`Created MarketingCampaign: ${campaign.name} (${campaign.id}) with group_id: ${campaign.group_id}`);

    // Query campaigns using the exact inclusion logic of getCampaignCRMPerformance
    console.log("\n=== Querying Campaigns ===");
    const queriedCampaigns = await prisma.marketingCampaign.findMany({
        where: {
            clientId,
            platform: 'meta'
        },
        include: {
            marketingMetrics: true,
            leads: true,
            group: true
        }
    });

    console.log(`Found ${queriedCampaigns.length} campaigns`);
    for (const c of queriedCampaigns) {
        console.log(`Campaign Name: "${c.name}"`);
        console.log(`  group_id: ${c.group_id}`);
        console.log(`  group relation:`, c.group);
        console.log(`  Resolved Group Name: ${c.group?.name || 'Unassigned'}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
