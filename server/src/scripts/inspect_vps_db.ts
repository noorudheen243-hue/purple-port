import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== CLIENTS IN DB ===");
    const clients = await prisma.client.findMany({
        select: { id: true, name: true }
    });
    for (const c of clients) {
        console.log(`Client: ${c.name} (${c.id})`);
    }

    console.log("\n=== MARKETING GROUPS IN DB ===");
    const groups = await prisma.marketingGroup.findMany({
        include: {
            client: { select: { name: true } }
        }
    });
    for (const g of groups) {
        console.log(`MarketingGroup: "${g.name}" (${g.id}), Client: ${g.client?.name || 'Unknown'}`);
    }

    console.log("\n=== MARKETING CAMPAIGNS WITH ASSIGNED GROUPS ===");
    const campaigns = await prisma.marketingCampaign.findMany({
        include: {
            group: true
        }
    });
    console.log(`Total marketing campaigns: ${campaigns.length}`);
    const assigned = campaigns.filter(c => c.group_id !== null);
    console.log(`Assigned marketing campaigns: ${assigned.length}`);
    for (const c of campaigns) {
        if (c.group_id) {
            console.log(`  Campaign: "${c.name}" (${c.id}) -> Group ID: ${c.group_id} ("${c.group?.name}")`);
        } else {
            console.log(`  Campaign: "${c.name}" (${c.id}) -> Unassigned (group_id is null)`);
        }
    }

    console.log("\n=== CRM GROUPS IN DB ===");
    const crmGroups = await prisma.crmGroup.findMany({
        include: {
            client: { select: { name: true } }
        }
    });
    for (const cg of crmGroups) {
        console.log(`CrmGroup: "${cg.name}" (${cg.id}), Client: ${cg.client?.name || 'Unknown'}`);
    }

    console.log("\n=== CRM GROUP CAMPAIGNS IN DB ===");
    const crmGroupCampaigns = await prisma.crmGroupCampaign.findMany({
        include: {
            crmGroup: true,
            campaign: true
        }
    });
    console.log(`Total CrmGroupCampaign links: ${crmGroupCampaigns.length}`);
    for (const cgc of crmGroupCampaigns) {
        console.log(`  Link: Campaign "${cgc.campaign?.name}" (${cgc.campaign_id}) -> CrmGroup "${cgc.crmGroup?.name}" (${cgc.crm_group_id})`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
