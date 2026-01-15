
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Financial Data Reset...');

    try {
        // 1. Delete Child Tables first to avoid constraint errors
        console.log('Deleting Invoice Items...');
        await prisma.clientInvoiceItem.deleteMany({});
        await prisma.invoiceItem.deleteMany({});

        console.log('Deleting Journal Lines...');
        await prisma.journalLine.deleteMany({});

        // 2. Delete Parent Transactional Tables
        console.log('Deleting Invoices...');
        await prisma.clientInvoice.deleteMany({});
        await prisma.invoice.deleteMany({}); // Delete Old Invoices

        console.log('Deleting Journal Entries (Transactions)...');
        await prisma.journalEntry.deleteMany({});

        // 3. Reset Sequences
        console.log('Resetting Sequences...');
        await prisma.invoiceSequence.deleteMany({});
        await prisma.transactionSequence.deleteMany({});

        // 4. Reset Balances (Master Data)
        console.log('Resetting Client Balances...');
        await prisma.client.updateMany({
            data: { advance_balance: 0.0 }
        });

        console.log('Resetting User Balances...');
        await prisma.user.updateMany({
            data: { advance_balance: 0.0 }
        });

        console.log('Resetting Ledger Balances...');
        await prisma.ledger.updateMany({
            data: { balance: 0.0 }
        });

        // 5. Delete Payroll Runs (Optional but likely desired for "Fresh Start")
        console.log('Deleting Payroll Slips...');
        await prisma.payrollSlip.deleteMany({});
        console.log('Deleting Payroll Runs...');
        await prisma.payrollRun.deleteMany({});

        console.log('✅ Financial Data Wipe Complete. System is fresh.');
    } catch (error) {
        console.error('❌ Error during reset:', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
