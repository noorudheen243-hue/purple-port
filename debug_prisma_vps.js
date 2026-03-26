const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('Testing Lead model...');
        const count = await prisma.lead.count();
        console.log(`Lead count: ${count}`);

        // Try to fetch with include
        const lead = await prisma.lead.findFirst({
            include: {
                marketingCampaign: true,
                follow_ups: true
            }
        });
        console.log('Successfully fetched lead with relations');
    } catch (e) {
        console.error('DEBUG ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
