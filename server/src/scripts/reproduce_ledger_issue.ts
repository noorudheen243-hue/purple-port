
import { PrismaClient } from '@prisma/client';
import { updateStaffFull, listStaff } from '../modules/team/service';

const prisma = new PrismaClient();

async function run() {
    // 1. Get a Staff Member (e.g., random one)
    const staff = await prisma.staffProfile.findFirst({
        include: { user: true }
    });

    if (!staff) {
        console.log("No staff found.");
        return;
    }

    console.log(`Testing with staff: ${staff.user.full_name} (${staff.id})`);

    // 2. Get an Account Head (Any Liability)
    const head = await prisma.accountHead.findFirst({
        where: { type: 'LIABILITY' }
    });

    if (!head) {
        console.log("No Liability Head found.");
        return;
    }
    console.log(`Using Head: ${head.name} (${head.code}) ID: ${head.id}`);

    // 3. Call Service
    console.log("Calling updateStaffFull with ledger creation...");
    try {
        await updateStaffFull(
            staff.id,
            {}, // No user updates
            {}, // No profile updates
            { create: true, head_id: head.id }
        );
        console.log("Service call completed.");
    } catch (e) {
        console.error("Service call failed:", e);
    }

    // 4. Verify
    const ledgers = await prisma.ledger.findMany({
        where: { entity_type: 'USER', entity_id: staff.user_id }
    });
    console.log("Ledgers found for user:", ledgers);
}

run()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
