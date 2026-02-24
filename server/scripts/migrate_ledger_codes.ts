import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Ledger ID Migration...");

    // 1. Fetch all ledgers ordered by creation date
    const ledgers = await prisma.ledger.findMany({
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${ledgers.length} ledgers to process.`);

    let sequence = 1;

    for (const ledger of ledgers) {
        // Only update if it doesn't already have a code (though none should yet)
        if (!ledger.ledger_code || !ledger.ledger_code.startsWith('QIXFML')) {
            const seqStr = sequence.toString().padStart(4, '0');
            const newCode = `QIXFML${seqStr}`;

            await prisma.ledger.update({
                where: { id: ledger.id },
                data: { ledger_code: newCode }
            });

            console.log(`Updated Ledger [${ledger.name}] -> ${newCode}`);
            sequence++;
        } else {
            console.log(`Skipped Ledger [${ledger.name}], already has code ${ledger.ledger_code}`);
        }
    }

    console.log("Migration Complete!");
}

main()
    .catch((e) => {
        console.error("Migration failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
