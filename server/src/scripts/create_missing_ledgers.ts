
import { PrismaClient } from '@prisma/client';
import { ensureLedger } from '../modules/accounting/service';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Ledger Backfill...");

    const clients = await prisma.client.findMany();
    console.log(`Found ${clients.length} clients.`);

    let created = 0;
    let skipped = 0;

    for (const client of clients) {
        const existing = await prisma.ledger.findFirst({
            where: {
                entity_type: 'CLIENT',
                entity_id: client.id
            }
        });

        if (!existing) {
            console.log(`Creating ledger for: ${client.name}`);
            try {
                // Determine group based on client type or default to Sundry Debtors
                // Using '4000' (Revenue/Income) or '1200' (Receivable)?
                // In service.ts: await ensureLedger('CLIENT', client.id, '4000');
                // Let's stick to the service default pattern.
                // Actually ensureLedger needs a headCode.
                // In service.ts updateClient -> defaults to '4000' (Direct Income) or '1000' (Assets/Receivable?)
                // Let's check service.ts usage again.
                // Line 127 in service.ts: await ensureLedger('CLIENT', client.id, '4000');

                await ensureLedger('CLIENT', client.id, '4000');
                created++;
            } catch (error) {
                console.error(`Failed to create for ${client.name}:`, error);
            }
        } else {
            // console.log(`Skipping ${client.name}, ledger exists.`);
            skipped++;
        }
    }

    console.log(`Backfill Complete. Created: ${created}, Skipped: ${skipped}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
