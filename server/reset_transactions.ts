
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Transaction Reset...");

    console.log("Deleting Invoice Items...");
    await prisma.invoiceItem.deleteMany({});

    console.log("Deleting Invoices...");
    // Update Invoice to unlink Journal Entry first to avoid constraint loops?
    // Actually, usually deleting Child (Invoice) is fine if Parent (Journal) is independent OR vice versa.
    // Invoice -> JournalEntry relation is optional.
    await prisma.invoice.deleteMany({});

    console.log("Deleting Journal Lines...");
    await prisma.journalLine.deleteMany({});

    console.log("Deleting Journal Entries...");
    await prisma.journalEntry.deleteMany({});

    console.log("Deleting Payroll Slips...");
    await prisma.payrollSlip.deleteMany({});

    console.log("Deleting Payroll Runs...");
    await prisma.payrollRun.deleteMany({});

    console.log("Resetting Ledger Balances...");
    await prisma.ledger.updateMany({
        data: { balance: 0.0 }
    });

    console.log("Transaction Reset Complete. All financials and payrolls wiped.");
}

main()
    .catch(e => {
        console.error("Error during reset:", e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());
