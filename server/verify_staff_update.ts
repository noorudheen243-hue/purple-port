
import { PrismaClient } from '@prisma/client';
import { updateStaffFull, createStaffProfile, onboardStaff } from './src/modules/team/service';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Staff Update Verification...");

    // 1. Create a dummy user/staff
    const uniqueId = Date.now().toString();
    const email = `test_staff_${uniqueId}@example.com`;

    console.log(`Creating Staff: ${email}`);

    // We use onboardStaff as it creates both User and Profile
    const created = await onboardStaff(
        {
            full_name: "Test Staff",
            email: email,
            password_hash: "password123",
            role: "MARKETING_EXEC",
            department: "MARKETING"
        },
        {
            staff_number: `EMP-${uniqueId}`,
            designation: "Junior Exec",
            department: "MARKETING",
            date_of_joining: new Date(),
            total_experience_years: 1,
            base_salary: 50000
        }
    );

    console.log(`Created Staff ID: ${created.profile.id}`);
    console.log(`Initial Designation: ${created.profile.designation}`);
    console.log(`Initial User Name: ${created.user.full_name}`);

    // 2. Update the staff member
    console.log("Updating Staff...");

    const updateResult = await updateStaffFull(
        created.profile.id,
        {
            full_name: "Test Staff Updated", // Updating User Field
        },
        {
            designation: "Senior Exec", // Updating Profile Field
            base_salary: 60000
        }
    );

    console.log("Update Function Returned:", updateResult);

    // 3. Verify Persistence
    const fetched = await prisma.staffProfile.findUnique({
        where: { id: created.profile.id },
        include: { user: true }
    });

    if (!fetched) {
        console.error("FAILED: Could not fetch profile after update.");
        return;
    }

    console.log(`Fetched Designation: ${fetched.designation}`);
    console.log(`Fetched User Name: ${fetched.user.full_name}`);
    console.log(`Fetched Salary: ${fetched.base_salary}`);

    const nameMatch = fetched.user.full_name === "Test Staff Updated";
    const desigMatch = fetched.designation === "Senior Exec";
    const salaryMatch = fetched.base_salary === 60000;

    if (nameMatch && desigMatch && salaryMatch) {
        console.log("SUCCESS: Staff update persisted correctly.");
    } else {
        console.error("FAILED: Updates did not match.");
        console.log({ nameMatch, desigMatch, salaryMatch });
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
