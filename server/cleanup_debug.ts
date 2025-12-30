
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function cleanup() {
    const email = 'nooru243@gmail.com';
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        // Delete profile then user
        await prisma.staffProfile.deleteMany({ where: { user_id: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
        console.log('Deleted user:', email);
    } else {
        console.log('User not found to delete.');
    }

    // Check Staff Numbers
    const staff = await prisma.staffProfile.findMany({ select: { staff_number: true } });
    console.log('Existing Staff Numbers:', staff.map(s => s.staff_number));
}
cleanup().catch(console.error).finally(() => prisma.$disconnect());
