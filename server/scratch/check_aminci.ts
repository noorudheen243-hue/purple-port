
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const client = await prisma.client.findFirst({
        where: { name: { contains: 'Aminci' } }
    });
    console.log('Client:', client);

    if (client) {
        const ledger = await prisma.ledger.findFirst({
            where: { entity_id: client.id, entity_type: 'CLIENT' }
        });
        console.log('Ledger:', ledger);
        
        const heads = await prisma.accountHead.findMany();
        console.log('Heads:', heads.map(h => ({id: h.id, name: h.name, code: h.code, type: h.type})));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
