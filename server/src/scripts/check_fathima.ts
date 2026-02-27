
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkFathima() {
    console.log("--- Fathima Hasna K Mapping Check ---\n");

    const staff = await db.staffProfile.findFirst({
        where: { staff_number: 'QIX0013' },
        include: { user: { select: { full_name: true } } }
    });

    if (staff) {
        console.log(`Staff Number: ${staff.staff_number}`);
        console.log(`Full Name:    ${staff.user?.full_name}`);
        console.log(`Biometric ID: ${staff.biometric_device_id}`);

        if (staff.biometric_device_id === '13') {
            console.log("\nStatus: Mapping is correct (ID=13).");
        } else {
            console.log(`\nStatus: Mapping is INCORRECT or MISSING. Current ID: ${staff.biometric_device_id}, Expected: 13`);
        }
    } else {
        console.log("Staff QIX0013 not found in DB.");
    }
}

checkFathima()
    .catch(console.error)
    .finally(() => db.$disconnect());
