import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const targets = [
    "SALMATH -DR NISHIDHA -CALICUT POSTER AD- WHATSAPP CAMPAIGN",
    "DR NISHIDHA -KOZHIKODE- WHATSAPP CAMPAIGN NEW FOR 2026",
    "DR NISHIDHA - VELLAM POAK - WHATSAPP CAMPAIGN",
    "DR NISHIDHA - HAIR LOSE -DR VIDEO- WHATSAPP CAMPAIGN",
    "ASHTAMI -DR NISHIDHA - INFERTILITY - KOZHIKKODE-WHATSAPP CAMPAIGN",
    "DR NISHIDHA-PROSTATE-DR VIDEO-WHATSAPP CAMPAIGN",
    "DR NISHIDHA - INFERTILITY - TESTIMONIAL- WHATSAPP CAMPAIGN",
    "DR NISHIDHA - PILES -2- DR VIDEO -WHATSAPP CAMPAIGN"
];

async function main() {
    console.log("=== TARGET CAMPAIGNS IN DB ===");
    for (const target of targets) {
        console.log(`\nSearching for: "${target}"`);
        const campaigns = await prisma.marketingCampaign.findMany({
            where: {
                name: {
                    contains: target.split(" - ")[0] // Search by first segment to be flexible with spaces
                }
            },
            include: {
                group: true,
                client: { select: { id: true, name: true } }
            }
        });
        
        console.log(`Matches found: ${campaigns.length}`);
        for (const c of campaigns) {
            console.log(`  - ID: ${c.id}`);
            console.log(`    Exact Name: "${c.name}"`);
            console.log(`    Client: "${c.client.name}" (${c.clientId})`);
            console.log(`    group_id: ${c.group_id}`);
            console.log(`    group name: ${c.group?.name || 'None'}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
