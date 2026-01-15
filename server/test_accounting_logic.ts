
import { PrismaClient } from '@prisma/client';
import * as AccountingService from './src/modules/accounting/service';

// Mock Express Request if needed or just call service directly?
// Service uses 'prisma' from utils usually. 
// I need to make sure I use the SAME prisma instance or context.
// AccountingService likely imports prisma from '../../utils/prisma'.

// I'll just write a script that mimics the Service logic explicitly to test prisma behavior, 
// OR import the service if I can configure ts-node to resolve paths.
// ts-node might fail on absolute/alias imports.
// I will copy the `recordTransaction` logic into this script to test the LOGIC.

const prisma = new PrismaClient();

async function main() {
    console.log("Testing Transaction Logic...");

    // 1. Create 2 Ledgers
    const l1 = await prisma.ledger.create({
        data: { name: "Test Sender", head: { connect: { code: '1000' } }, entity_type: 'INTERNAL' }
    });
    const l2 = await prisma.ledger.create({
        data: { name: "Test Receiver", head: { connect: { code: '2000' } }, entity_type: 'INTERNAL' }
    });

    console.log(`Created Ledgers: ${l1.id} (Bal: ${l1.balance}), ${l2.id} (Bal: ${l2.balance})`);

    // 2. Run Transaction Logic (Mimic Service)
    const amount = 500;

    await prisma.$transaction(async (tx) => {
        const entry = await tx.journalEntry.create({
            data: {
                description: "Test Tx",
                amount: amount,
                type: 'JOURNAL',
                created_by_id: 'SYSTEM',
                lines: {
                    create: [
                        { ledger_id: l2.id, debit: amount, credit: 0 },
                        { ledger_id: l1.id, debit: 0, credit: amount }
                    ]
                }
            }
        });

        // Update Balances
        await tx.ledger.update({
            where: { id: l2.id },
            data: { balance: { increment: amount } }
        });
        await tx.ledger.update({
            where: { id: l1.id },
            data: { balance: { decrement: amount } }
        });
    });

    // 3. Verify Balances
    const l1_new = await prisma.ledger.findUnique({ where: { id: l1.id } });
    const l2_new = await prisma.ledger.findUnique({ where: { id: l2.id } });

    console.log(`L1 (Sender) Balance: ${l1_new?.balance} (Expected -500)`);
    console.log(`L2 (Receiver) Balance: ${l2_new?.balance} (Expected 500)`);

    // Cleanup
    await prisma.journalLine.deleteMany({ where: { entry: { description: "Test Tx" } } });
    await prisma.journalEntry.deleteMany({ where: { description: "Test Tx" } });
    await prisma.ledger.deleteMany({ where: { name: { contains: "Test" } } });
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
