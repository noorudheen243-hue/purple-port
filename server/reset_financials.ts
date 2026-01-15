import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetFinancials() {
    console.log('WARNING: This will wipe ALL financial data (Transactions, Invoices, Ledger Balances).');
    console.log('Starting Reset in 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));

    await prisma.$transaction(async (tx) => {
        // 1. Delete Invoices (Cascades to InvoiceItems)
        console.log('Deleting Invoices...');
        const deletedInvoices = await tx.invoice.deleteMany();
        console.log(`Deleted ${deletedInvoices.count} Invoices.`);

        // 2. Delete Journal Lines
        console.log('Deleting Journal Lines...');
        const deletedLines = await tx.journalLine.deleteMany();
        console.log(`Deleted ${deletedLines.count} Journal Lines.`);

        // 3. Delete Journal Entries
        console.log('Deleting Journal Entries...');
        const deletedEntries = await tx.journalEntry.deleteMany();
        console.log(`Deleted ${deletedEntries.count} Journal Entries.`);

        // 4. Reset Ledger Balances (Set all to 0)
        console.log('Resetting Ledger Balances...');
        const updatedLedgers = await tx.ledger.updateMany({
            data: { balance: 0.0 }
        });
        console.log(`Reset ${updatedLedgers.count} Ledgers to 0.00.`);
    });

    console.log('Financial Data Wipe Complete.');
}

resetFinancials()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
