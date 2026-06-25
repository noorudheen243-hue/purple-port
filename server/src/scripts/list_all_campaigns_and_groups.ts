import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== Listing Clients ===");
    const clients = await prisma.client.findMany({
        select: { id: true, name: true }
    });
    for (const c of clients) {
        console.log(`Client: ${c.name} (${c.id})`);
    }

    console.log("\n=== Listing MarketingGroups ===");
    const groups = await prisma.marketingGroup.findMany({
        include: {
            client: { select: { name: true } },
            _count: { select: { campaigns: true } }
        }
    });
    for (const g of groups) {
        console.log(`Group: ${g.name} (${g.id}), Client: ${g.client?.name || 'Unknown'}, Campaigns: ${g._count.campaigns}`);
    }

    console.log("\n=== Listing CrmGroups ===");
    const crmGroups = await prisma.crmGroup.findMany({
        include: {
            client: { select: { name: true } },
            _count: { select: { campaigns: true, leads: true } }
        }
    });
    for (const g of crmGroups) {
        console.log(`CrmGroup: ${g.name} (${g.id}), Client: ${g.client?.name || 'Unknown'}, Campaigns: ${g._count.campaigns}, Leads: ${g._count.leads}`);
    }

    console.log("\n=== Listing MarketingCampaigns with their group_id and group ===");
    const campaigns = await prisma.marketingCampaign.findMany({
        include: {
            group: true,
            CrmGroupCampaign: {
                include: {
                    crmGroup: true
                }
            }
        }
    });
    console.log(`Total campaigns: ${campaigns.length}`);
    for (const c of campaigns) {
        console.log(`Campaign: "${c.name}" (${c.id})`);
        console.log(`  group_id (MarketingGroup): ${c.group_id} -> Name: ${c.group?.name || 'None'}`);
        console.log(`  CrmGroupCampaign: ${c.CrmGroupCampaign.map(gc => gc.crmGroup.name).join(', ') || 'None'}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
