"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting Financial Data Reset...');
        try {
            // 1. Delete Child Tables first to avoid constraint errors
            console.log('Deleting Invoice Items...');
            yield prisma.clientInvoiceItem.deleteMany({});
            yield prisma.invoiceItem.deleteMany({});
            console.log('Deleting Journal Lines...');
            yield prisma.journalLine.deleteMany({});
            // 2. Delete Parent Transactional Tables
            console.log('Deleting Invoices...');
            yield prisma.clientInvoice.deleteMany({});
            yield prisma.invoice.deleteMany({}); // Delete Old Invoices
            console.log('Deleting Journal Entries (Transactions)...');
            yield prisma.journalEntry.deleteMany({});
            // 3. Reset Sequences
            console.log('Resetting Sequences...');
            yield prisma.invoiceSequence.deleteMany({});
            yield prisma.transactionSequence.deleteMany({});
            // 4. Reset Balances (Master Data)
            console.log('Resetting Client Balances...');
            yield prisma.client.updateMany({
                data: { advance_balance: 0.0 }
            });
            console.log('Resetting User Balances...');
            yield prisma.user.updateMany({
                data: { advance_balance: 0.0 }
            });
            console.log('Resetting Ledger Balances...');
            yield prisma.ledger.updateMany({
                data: { balance: 0.0 }
            });
            // 5. Delete Payroll Runs (Optional but likely desired for "Fresh Start")
            console.log('Deleting Payroll Slips...');
            yield prisma.payrollSlip.deleteMany({});
            console.log('Deleting Payroll Runs...');
            yield prisma.payrollRun.deleteMany({});
            console.log('✅ Financial Data Wipe Complete. System is fresh.');
        }
        catch (error) {
            console.error('❌ Error during reset:', error);
        }
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
