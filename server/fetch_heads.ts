
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const heads = await prisma.accountHead.findMany({
        orderBy: { code: 'asc' }
    });
    console.log("--- Account Heads ---");
    heads.forEach(h => {
        console.log(`${h.code} - ${h.name} (${h.type})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
