import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findUser() {
    const staff = await prisma.staffProfile.findFirst({
        select: { user_id: true }
    });
    if (staff) {
        console.log("VALID_USER_ID:", staff.user_id);
    } else {
        console.log("No staff found");
    }
    await prisma.$disconnect();
}

findUser();
