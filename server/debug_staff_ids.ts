
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Current Staff Profiles ---");
    const staff = await prisma.staffProfile.findMany({
        include: { user: true }
    });

    if (staff.length === 0) {
        console.log("No staff profiles found.");
    } else {
        staff.forEach(s => {
            console.log(`User: ${s.user.full_name} | Staff Number: '${s.staff_number}' | Staff ID (UUID): ${s.id}`);
        });
    }
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
