import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clientId = 'db6df8c3-0ec8-4b17-8071-e39746b8be35';
    console.log(`=== SIMULATING ENDPOINT FOR CLIENT ${clientId} ===`);

    const campaigns = await prisma.marketingCampaign.findMany({
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

    console.log(`Total campaigns fetched: ${campaigns.length}`);
    
    // Print campaigns that are in the screenshot
    const screenshotKeywords = [
        "SALMATH -DR NISHIDHA -CALICUT POSTER AD",
        "DR NISHIDHA -KOZHIKODE- WHATSAPP CAMPAIGN",
        "DR NISHIDHA - VELLAM POAK - WHATSAPP CAMPAIGN",
        "DR NISHIDHA - HAIR LOSE",
        "ASHTAMI -DR NISHIDHA - INFERTILITY",
        "DR NISHIDHA-PROSTATE-DR VIDEO-WHATSAPP",
        "DR NISHIDHA - INFERTILITY - TESTIMONIAL",
        "DR NISHIDHA - PILES -2-"
    ];

    for (const kw of screenshotKeywords) {
        console.log(`\nMatches for keyword "${kw}":`);
        const matches = campaigns.filter(c => c.name.toLowerCase().includes(kw.toLowerCase()));
        for (const m of matches) {
            console.log(`  - Name: "${m.name}"`);
            console.log(`    group_id: ${m.group_id}`);
            console.log(`    group name in relation: ${m.group?.name || 'null'}`);
            console.log(`    resolved groupName: ${m.group?.name || 'Unassigned'}`);
            console.log(`    status: ${m.status}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
