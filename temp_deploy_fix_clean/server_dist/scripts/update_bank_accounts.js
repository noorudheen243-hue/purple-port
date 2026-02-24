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
function updateBankAccounts() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🏦 Updating Bank Accounts...");
        // 1. Rename "Main Bank Account" to "Main Bank A/C (Canara Bank)"
        const mainLedger = yield prisma.ledger.findFirst({
            where: { name: 'Main Bank Account' }
        });
        if (mainLedger) {
            yield prisma.ledger.update({
                where: { id: mainLedger.id },
                data: { name: 'Main Bank A/C (Canara Bank)' }
            });
            console.log("✅ Renamed 'Main Bank Account' to 'Main Bank A/C (Canara Bank)'");
        }
        else {
            console.log("⚠️ 'Main Bank Account' not found. Checking if already renamed...");
            const existingCanara = yield prisma.ledger.findFirst({
                where: { name: 'Main Bank A/C (Canara Bank)' }
            });
            if (existingCanara) {
                console.log("ℹ️ 'Main Bank A/C (Canara Bank)' already exists.");
            }
            else {
                console.error("❌ Could not find Main Bank Account to rename.");
            }
        }
        // 2. Add "Secondary Bank Account (HDFC Bank)"
        // Need to find 'Assets' head first.
        const assetsHead = yield prisma.accountHead.findUnique({
            where: { name: 'Assets' }
        });
        if (!assetsHead) {
            console.error("❌ 'Assets' Account Head not found!");
            return;
        }
        const hdfcName = 'Secondary Bank Account (HDFC Bank)';
        const existingHDFC = yield prisma.ledger.findFirst({
            where: { name: hdfcName }
        });
        if (!existingHDFC) {
            // Check for old "Secondary Bank Account" to rename if it exists
            const oldSecondary = yield prisma.ledger.findFirst({
                where: { name: 'Secondary Bank Account' }
            });
            if (oldSecondary) {
                yield prisma.ledger.update({
                    where: { id: oldSecondary.id },
                    data: { name: hdfcName }
                });
                console.log("✅ Renamed 'Secondary Bank Account' to 'Secondary Bank Account (HDFC Bank)'");
            }
            else {
                // Create new
                yield prisma.ledger.create({
                    data: {
                        name: hdfcName,
                        head_id: assetsHead.id,
                        entity_type: 'BANK', // Using BANK type based on schema/seed
                        balance: 0.0,
                        status: 'ACTIVE'
                    }
                });
                console.log(`✅ Created '${hdfcName}'`);
            }
        }
        else {
            console.log(`ℹ️ '${hdfcName}' already exists.`);
        }
    });
}
updateBankAccounts()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
