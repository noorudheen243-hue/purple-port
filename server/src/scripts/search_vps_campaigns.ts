import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== SEARCHING CAMPAIGNS FOR NISHIDHA ===");
    const campaigns = await prisma.marketingCampaign.findMany({
        where: {
            name: {
                contains: "NISHIDHA"
            }
        },
        include: {
            group: true
        }
    });

    console.log(`Found ${campaigns.length} campaigns containing "NISHIDHA":`);
    for (const c of campaigns) {
        console.log(`- ID: ${c.id}`);
        console.log(`  Name: "${c.name}"`);
        console.log(`  group_id: ${c.group_id}`);
        console.log(`  group name: ${c.group?.name || 'None'}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
