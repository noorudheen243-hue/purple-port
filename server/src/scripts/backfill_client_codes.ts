import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Client Code Backfill...");

    // Fetch all clients ordered by creation date
    const clients = await prisma.client.findMany({
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${clients.length} clients to process.`);

    let counter = 1;

    for (const client of clients) {
        // If already has code, skip or maybe respect it? 
        // User asked to "Auto create... on priority of client created". 
        // So safe to overwrite or fill if missing. Let's fill if missing or if format is wrong.

        // Construct ID: QCN + 4 digits (padded)
        const code = `QCN${counter.toString().padStart(4, '0')}`;

        // Update
        if (!client.client_code) {
            await prisma.client.update({
                where: { id: client.id },
                data: { client_code: code }
            });
            console.log(`Updated ${client.name} -> ${code}`);
        } else {
            console.log(`Skipping ${client.name}, already has code: ${client.client_code}`);
        }

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
