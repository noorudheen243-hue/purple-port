import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.count();
    const clients = await prisma.client.count();
    console.log(`Users: ${users}, Clients: ${clients}`);
}
main().finally(() => prisma.$disconnect());
