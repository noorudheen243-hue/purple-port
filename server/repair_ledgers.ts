import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLedgers() {
    console.log('Starting Ledger Repair...');

    const clients = await prisma.client.findMany();
    let updatedCount = 0;

    for (const client of clients) {
        // Find ledgers with matching name but NO entity_id
        const orphanLedgers = await prisma.ledger.findMany({
            where: {
                name: client.name,
                OR: [
                    { entity_id: null },
                    { entity_type: { not: 'CLIENT' } }
                ]
            }
        });

        for (const ledger of orphanLedgers) {
            console.log(`Fixing Ledger: "${ledger.name}" -> Client: ${client.id}`);
            await prisma.ledger.update({
                where: { id: ledger.id },
                data: {
                    entity_type: 'CLIENT',
                    entity_id: client.id
                }
            });
            updatedCount++;
        }
    }

    console.log(`Repair Complete. Fixed ${updatedCount} ledgers.`);
}

fixLedgers()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
