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
function fixLedgers() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Fetching all staff profiles...");
        const staffList = yield prisma.staffProfile.findMany({
            include: { user: true }
        });
        for (const staff of staffList) {
            console.log(`Checking staff: ${staff.user.full_name} (${staff.user_id})`);
            // 1. Find Ledger by Entity ID (Correct State)
            const correctLedger = yield prisma.ledger.findFirst({
                where: { entity_type: 'USER', entity_id: staff.user_id }
            });
            if (correctLedger) {
                console.log(`  [OK] Ledger found by ID: ${correctLedger.name}`);
                continue;
            }
            // 2. Find Ledger by Name (Broken State)
            const nameLedger = yield prisma.ledger.findFirst({
                where: { entity_type: 'USER', name: staff.user.full_name }
            });
            if (nameLedger) {
                console.log(`  [FIX NEEDED] Ledger found by NAME but ID mismatch/missing: ${nameLedger.name} (ID: ${nameLedger.entity_id})`);
                yield prisma.ledger.update({
                    where: { id: nameLedger.id },
                    data: { entity_id: staff.user_id }
                });
                console.log(`  [FIXED] Updated entity_id to ${staff.user_id}`);
            }
            else {
                console.log(`  [MISSING] No ledger found by ID or Name.`);
                // Optional: Create one? No, user action should drive creation.
            }
        }
    });
}
fixLedgers()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
