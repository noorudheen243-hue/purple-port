import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const settings = await prisma.systemSetting.findMany();
    console.log(JSON.stringify(settings, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
