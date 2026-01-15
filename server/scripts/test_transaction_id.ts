
import prisma from '../src/utils/prisma';
import { generateTransactionId } from '../src/utils/transactionIdGenerator';

async function main() {
    console.log("Testing Transaction ID Generation...");

    // Simulate database transaction
    await prisma.$transaction(async (tx) => {
        const id1 = await generateTransactionId(tx);
        console.log("Generated ID 1: ", id1);

        const id2 = await generateTransactionId(tx);
        console.log("Generated ID 2: ", id2);

        // Check format QTNYYMM...
        if (!id1.startsWith('QTN')) throw new Error("Invalid Prefix");
        if (id1 === id2) throw new Error("Duplicate ID generated!");
    });

    console.log("Verification Successful.");
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(() => prisma.$disconnect());
