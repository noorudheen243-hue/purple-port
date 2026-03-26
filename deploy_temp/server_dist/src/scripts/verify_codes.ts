import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clients = await prisma.client.findMany({
        select: { id: true, name: true, client_code: true }
    });
    console.table(clients);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
