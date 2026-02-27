
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function updateFathimaTo15() {
    console.log("--- Updating Fathima Hasna K Mapping to UID 15 ---\n");

    const staff = await db.staffProfile.findFirst({
        where: { staff_number: 'QIX0013' }
    });

    if (staff) {
        await db.staffProfile.update({
            where: { id: staff.id },
            data: { biometric_device_id: '15' }
        });

        console.log("SUCCESS: Biometric ID updated to '15'.");
    } else {
        console.log("ERROR: Staff QIX0013 not found in DB.");
    }
}

updateFathimaTo15()
    .catch(console.error)
    .finally(() => db.$disconnect());
