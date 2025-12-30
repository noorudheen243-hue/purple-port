
import { PrismaClient } from '@prisma/client';
import { updateStaffFull } from './src/modules/team/service'; // Adjust import if needed, might need relative path

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Staff Update Verification...");

    // 1. Find a staff member
    const staff = await prisma.staffProfile.findFirst({
        include: { user: true }
    });

    if (!staff) {
        console.error("No staff found to test update.");
        return;
    }

    console.log(`Found Staff: ${staff.user.full_name} (${staff.id})`);

    // 2. Prepare Update Data
    const userData = {
        full_name: staff.user.full_name + " (Edited)"
    };

    // Add some payroll data to test the fields I added
    const profileData = {
        designation: staff.designation,
        bank_name: "Test Bank Updates",
        salary_type: "MONTHLY"
    };

    console.log("Attempting Update...");

    try {
        const result = await updateStaffFull(staff.id, userData, profileData as any);
        console.log("Update SUCCESS:", result);
    } catch (error) {
        console.error("Update FAILED:", error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
