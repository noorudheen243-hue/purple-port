import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
    const email = 'nooru243@gmail.com';
    const user = await prisma.user.findUnique({ where: { email } });
    console.log('User found:', user);
}
check().catch(console.error).finally(() => prisma.$disconnect());
