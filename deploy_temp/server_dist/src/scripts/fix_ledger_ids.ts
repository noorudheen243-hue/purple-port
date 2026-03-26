
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLedgerIds() {
    const profiles = await prisma.staffProfile.findMany({
        include: { user: true }
    });

    const ledgers = await prisma.ledger.findMany({
        where: { entity_type: 'USER' }
    });

    console.log(`Checking ${profiles.length} profiles against ${ledgers.length} ledgers...`);

    for (const p of profiles) {
        // Check if already linked correctly
        const exactMatch = ledgers.find(l => l.entity_id === p.user_id);

        if (!exactMatch) {
            // Check for name match (case-insensitive)
            const nameMatch = ledgers.find(l => l.name.toLowerCase() === p.user.full_name.toLowerCase());

            if (nameMatch) {
                console.log(`Fixing Ledger for '${p.user.full_name}':`);
                console.log(`  - Ledger Name: ${nameMatch.name}`);
                console.log(`  - Old Entity ID: ${nameMatch.entity_id}`);
                console.log(`  - New Entity ID: ${p.user_id}`);

                await prisma.ledger.update({
                    where: { id: nameMatch.id },
                    data: { entity_id: p.user_id }
                });
                console.log(`  -> FIXED.\n`);
            }
        }
    }
}

fixLedgerIds()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
