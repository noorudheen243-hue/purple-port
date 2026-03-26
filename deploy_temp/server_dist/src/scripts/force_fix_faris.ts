
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceFixFaris() {
    console.log("Force fixing Faris...");

    // 1. Get Faris
    const faris = await prisma.user.findFirst({ where: { full_name: 'Faris' } });
    if (!faris) return console.log("Faris User not found");

    // 2. Get Ledger
    const ledger = await prisma.ledger.findFirst({ where: { name: 'Faris' } });
    if (!ledger) return console.log("Faris Ledger not found");

    console.log(`Linking Ledger ${ledger.id} to User ${faris.id}`);

    await prisma.ledger.update({
        where: { id: ledger.id },
        data: { entity_id: faris.id }
    });

    console.log("FIXED.");
}

forceFixFaris()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
