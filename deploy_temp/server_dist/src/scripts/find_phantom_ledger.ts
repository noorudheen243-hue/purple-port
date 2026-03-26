
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findPhantomLedger() {
    console.log("Searching for 'Faris' in ALL Ledgers...");

    // 1. Get Faris user ID
    const farisProfile = await prisma.staffProfile.findFirst({
        where: { user: { full_name: { contains: 'Faris' } } },
        include: { user: true }
    });

    if (!farisProfile) {
        console.log("CRITICAL: Staff profile for 'Faris' NOT FOUND!");
        return;
    }

    console.log(`Target Staff: ${farisProfile.user.full_name} (ID: ${farisProfile.user_id})`);

    // 2. Fetch ALL Ledgers
    const allLedgers = await prisma.ledger.findMany();

    console.log(`Scanning ${allLedgers.length} total ledgers...`);

    const matches = allLedgers.filter(l =>
        l.name.toLowerCase().includes('faris') ||
        l.entity_id === farisProfile.user_id
    );

    if (matches.length === 0) {
        console.log("RESULT: ABSOLUTELY NO TRACE of 'Faris' in Ledgers table.");
        console.log("This confirms the creation FAILED or was skipped.");
    } else {
        console.log(`RESULT: Found ${matches.length} potential matches:`);
        matches.forEach(m => {
            console.log(` - ID: ${m.id}`);
            console.log(`   Name: "${m.name}"`);
            console.log(`   Type: ${m.entity_type}`);
            console.log(`   EntityID: ${m.entity_id}`);
            console.log(`   HeadID: ${m.head_id}`);
        });
    }
}

findPhantomLedger()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
