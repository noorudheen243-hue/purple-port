import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Client Code Backfill...");

    // Fetch all clients ordered by creation date
    const clients = await prisma.client.findMany({
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${clients.length} clients to process.`);

    // 1. Build Registry of used codes
    const usedCodes = new Set(clients.map(c => c.client_code).filter(c => c));

    let counter = 1;

    for (const client of clients) {
        if (client.client_code) continue;

        // Find next free code
        let candidate = `QCN${counter.toString().padStart(4, '0')}`;
        while (usedCodes.has(candidate)) {
            counter++;
            candidate = `QCN${counter.toString().padStart(4, '0')}`;
        }

        // Found one
        await prisma.client.update({
            where: { id: client.id },
            data: { client_code: candidate }
        });
        console.log(`Updated ${client.name} -> ${candidate}`);
        usedCodes.add(candidate);

        // Optimistically increment for next iteration to reduce while-loop hits
        counter++;
    }

    console.log("Backfill complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
