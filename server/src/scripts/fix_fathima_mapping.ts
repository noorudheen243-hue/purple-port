
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function fixFathimaMapping() {
    console.log("--- Fixing Fathima Hasna K Mapping ---\n");

    const staff = await db.staffProfile.findFirst({
        where: { staff_number: 'QIX0013' }
    });

    if (staff) {
        console.log(`Current Biometric ID for QIX0013: ${staff.biometric_device_id}`);

        await db.staffProfile.update({
            where: { id: staff.id },
            data: { biometric_device_id: '13' }
        });

        console.log("SUCCESS: Biometric ID updated to '13'.");

        // Check update
        const updated = await db.staffProfile.findUnique({ where: { id: staff.id } });
        console.log(`Verified Biometric ID: ${updated?.biometric_device_id}`);
    } else {
        console.log("ERROR: Staff QIX0013 not found in DB.");
    }
}

fixFathimaMapping()
    .catch(console.error)
    .finally(() => db.$disconnect());
