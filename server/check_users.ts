import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function checkUsers() {
    const count = await prisma.user.count();
    console.log(`User Count: ${count}`);
    if (count > 0) {
        const admin = await prisma.user.findFirst({ where: { email: 'admin@qixads.com' } });
        console.log('Admin User:', admin);
    }
}
checkUsers().catch(console.error).finally(() => prisma.$disconnect());
