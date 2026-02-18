
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listStaff() {
    const profiles = await prisma.staffProfile.findMany({
        include: { user: true }
    });

    console.log(`Found ${profiles.length} staff profiles:`);
    profiles.forEach(p => {
        console.log(`- ${p.user.full_name} (User ID: ${p.user_id}) | Staff No: ${p.staff_number}`);
    });
}

listStaff()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
