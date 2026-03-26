import prisma from '../utils/prisma';

async function fixLeadDates() {
    console.log('Fetching leads with metaCreatedAt...');
    const leads = await (prisma as any).lead.findMany({
        where: {
            metaCreatedAt: { not: null },
            source: 'AUTO'
        }
    });

    console.log(`Found ${leads.length} leads to fix.`);

    for (const lead of leads) {
        if (lead.metaCreatedAt && lead.date.getTime() !== lead.metaCreatedAt.getTime()) {
            await (prisma as any).lead.update({
                where: { id: lead.id },
                data: { date: lead.metaCreatedAt }
            });
        }
    }

    console.log('Lead dates fix completed.');
}

fixLeadDates()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
