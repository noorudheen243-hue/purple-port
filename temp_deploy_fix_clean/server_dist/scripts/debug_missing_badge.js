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
function debugMissingBadge() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Fetch all staff profiles
        const profiles = yield prisma.staffProfile.findMany({
            include: { user: true }
        });
        console.log(`Analyzing ${profiles.length} staff profiles...`);
        // 2. Fetch ALL ledgers to see what's actually in DB
        const allLedgers = yield prisma.ledger.findMany();
        // 3. Simulate listStaff logic
        const userIds = profiles.map(p => p.user_id);
        const mappedLedgers = yield prisma.ledger.findMany({
            where: {
                entity_type: 'USER',
                entity_id: { in: userIds }
            },
            select: { entity_id: true, head_id: true, name: true } // Selected naming for debug
        });
        const ledgerMap = new Map(mappedLedgers.map(l => [l.entity_id, l]));
        console.log(`\n--- SIMULATED listStaff output ---`);
        for (const p of profiles) {
            const hasLedger = ledgerMap.has(p.user_id);
            const mappedData = ledgerMap.get(p.user_id);
            console.log(`Staff: ${p.user.full_name.padEnd(20)} | UserID: ${p.user_id} | HasBadge: ${hasLedger ? 'YES' : 'NO'}`);
            if (!hasLedger) {
                // why?
                // Search for any ledger with this name
                const looseMatch = allLedgers.find(l => l.name.toLowerCase() === p.user.full_name.toLowerCase());
                if (looseMatch) {
                    console.log(`    -> FOUND LEDGER BY NAME!`);
                    console.log(`       ID: ${looseMatch.id}`);
                    console.log(`       Name: ${looseMatch.name}`);
                    console.log(`       EntityID: ${looseMatch.entity_id} (Expected: ${p.user_id})`);
                    console.log(`       EntityType: ${looseMatch.entity_type} (Expected: USER)`);
                    if (looseMatch.entity_id !== p.user_id)
                        console.log(`       [FAIL] Entity ID mismatch.`);
                    if (looseMatch.entity_type !== 'USER')
                        console.log(`       [FAIL] Entity Type mismatch.`);
                }
                else {
                    console.log(`    -> No ledger found by name either.`);
                }
            }
        }
    });
}
debugMissingBadge()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
