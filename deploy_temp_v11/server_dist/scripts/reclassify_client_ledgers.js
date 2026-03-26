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
function reclassifyClientLedgers() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🔄 Reclassifying Client Ledgers to INCOME...");
        // 1. Find 'Income' Account Head
        const incomeHead = yield prisma.accountHead.findUnique({
            where: { code: '4000' } // Income Code
        });
        if (!incomeHead) {
            console.error("❌ 'Income' Account Head (Code 4000) not found!");
            return;
        }
        console.log(`✅ Found Income Head: ${incomeHead.name} (${incomeHead.id})`);
        // 2. Find All Client Ledgers
        // We assume entity_type 'CLIENT' is consistent.
        const clientLedgers = yield prisma.ledger.findMany({
            where: { entity_type: 'CLIENT' }
        });
        console.log(`ℹ️ Found ${clientLedgers.length} Client Ledgers to process.`);
        let validUpdates = 0;
        const errors = [];
        for (const ledger of clientLedgers) {
            if (ledger.head_id === incomeHead.id) {
                console.log(`🔹 Skipping ${ledger.name} (Already Income)`);
                continue;
            }
            try {
                // Update the Head ID
                // NOTE: Changing Head ID does NOT change the balance sign automatically in DB,
                // but the SYSTEM interprets Asset Balance (positive) vs Income Balance (positive = credit).
                // A Debit Balance in Asset (Receivable) is "You owe me".
                // If moved to Income: Positive Balance = "I earned this".
                // WAIT. Accounts Receivable (Asset) Debit Balance = Positive.
                // Income (Revenue) Credit Balance = Positive.
                // If a client owes us 1000 (Dr 1000 in AR), and we switch it to Income Head:
                // An Income Ledger with Dr 1000 means "Negative Income" or "Contra Revenue".
                // This Logic Change implies:
                // "Income from Client" ledger usually tracks REVENUE.
                // "Cash/Bank" Dr 1000, "Client Income" Cr 1000.
                // BUT "Advance from Client" is Liability.
                // The User said: "Income from client as may be service charge or advance and expenses as cash returns".
                // If we just change the HEAD, the semantics change.
                // Existing Ledgers are "Client Ledgers" used as ACCOUNTS RECEIVABLE usually?
                // "Auto-create Client Ledger under Assets (1000 - Accounts Receivable)" was the old code.
                // So these hold "What Client Owes Us".
                // If we move it to "INCOME", it becomes a Revenue Account.
                // Valid? "Income from Client". A specific ledger for that client's revenue.
                // Yes, user requested "Group head from Assets to Income".
                // Do we need to invert the balance?
                // Asset: Dr 100 (Owed).
                // Income: Cr 100 (Earned).
                // No, the Journal Entries (Dr Client, Cr Sales) created the balance.
                // If we blindly change Head, the historical JE "Dr Client" remains "Dr Client".
                // "Dr Client (Income)" -> Reduces Income?
                // If I invoice a client: Dr AR (Asset), Cr Service Income (Income).
                // If Client LEDGER ITSELF is the Income Account:
                // The JE would be: Dr AR (Asset?), Cr Client Ledger (Income).
                // The user implies the Client Ledger IS the Income Ledger.
                // So when we Invoice: Dr Cash/Bank (or AR control), Cr Client Ledger.
                // This is "Cash Basis" or direct revenue tracking per client.
                // Just shifting the Head ID is what's requested. Logic interpretation happens elsewhere.
                yield prisma.ledger.update({
                    where: { id: ledger.id },
                    data: { head_id: incomeHead.id }
                });
                validUpdates++;
                process.stdout.write('.');
            }
            catch (e) {
                errors.push(`${ledger.name}: ${e.message}`);
            }
        }
        console.log(`\n✅ Successfully reclassified ${validUpdates} ledgers.`);
        if (errors.length > 0) {
            console.error("\n❌ Errors:");
            errors.forEach(e => console.error(e));
        }
    });
}
reclassifyClientLedgers()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
