
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLedgers() {
    console.log("Fetching all staff profiles...");
    const staffList = await prisma.staffProfile.findMany({
        include: { user: true }
    });

    for (const staff of staffList) {
        console.log(`Checking staff: ${staff.user.full_name} (${staff.user_id})`);

        // 1. Find Ledger by Entity ID (Correct State)
        const correctLedger = await prisma.ledger.findFirst({
            where: { entity_type: 'USER', entity_id: staff.user_id }
        });

        if (correctLedger) {
            console.log(`  [OK] Ledger found by ID: ${correctLedger.name}`);
            continue;
        }

        // 2. Find Ledger by Name (Broken State)
        const nameLedger = await prisma.ledger.findFirst({
            where: { entity_type: 'USER', name: staff.user.full_name }
        });

        if (nameLedger) {
            console.log(`  [FIX NEEDED] Ledger found by NAME but ID mismatch/missing: ${nameLedger.name} (ID: ${nameLedger.entity_id})`);

            await prisma.ledger.update({
                where: { id: nameLedger.id },
                data: { entity_id: staff.user_id }
            });
            console.log(`  [FIXED] Updated entity_id to ${staff.user_id}`);
        } else {
            console.log(`  [MISSING] No ledger found by ID or Name.`);
            // Optional: Create one? No, user action should drive creation.
        }
    }
}

fixLedgers()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
