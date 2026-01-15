
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStaffLedgers() {
    console.log("Fetching staff profiles...");
    const profiles = await prisma.staffProfile.findMany({
        include: { user: true }
    });

    console.log(`Found ${profiles.length} staff profiles.`);

    const userIds = profiles.map(p => p.user_id);

    console.log("Checking for Ledgers with entity_type='USER'...");
    const ledgers = await prisma.ledger.findMany({
        where: {
            entity_type: 'USER',
            entity_id: { in: userIds }
        }
    });

    console.log(`Found ${ledgers.length} linked ledgers.`);

    profiles.forEach(p => {
        const ledger = ledgers.find(l => l.entity_id === p.user_id);
        if (ledger) {
            console.log(`[YES] ${p.user.full_name} (${p.designation}) - Ledger found.`);
        } else {
            console.log(`[NO]  ${p.user.full_name} (${p.designation}) - No Ledger.`);
        }
    });
}

checkStaffLedgers()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
