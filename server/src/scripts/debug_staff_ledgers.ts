
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugStaffLedgers() {
    const profiles = await prisma.staffProfile.findMany({
        include: { user: true }
    });

    const ledgers = await prisma.ledger.findMany({
        where: { entity_type: 'USER' }
    });

    console.log(`Found ${profiles.length} profiles and ${ledgers.length} USER ledgers.`);

    profiles.forEach(p => {
        // Find ledger by matching User ID
        const matchedById = ledgers.find(l => l.entity_id === p.user_id);
        // Find ledger by matching Name (loose check)
        const matchedByName = ledgers.find(l => l.name.toLowerCase() === p.user.full_name.toLowerCase());

        console.log(`\nStaff: ${p.user.full_name} (${p.designation})`);
        console.log(`  - User ID: ${p.user_id}`);
        console.log(`  - Linked Ledger (ID Match): ${matchedById ? `YES [${matchedById.name}]` : 'NO'}`);

        if (!matchedById && matchedByName) {
            console.log(`  - WARNING: Found Ledger by Name '${matchedByName.name}' but ID mismatch!`);
            console.log(`    -> Ledger Entity ID: ${matchedByName.entity_id}`);
            console.log(`    -> Expected User ID: ${p.user_id}`);
        }
    });
}

debugStaffLedgers()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
