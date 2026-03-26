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
function fixAllLedgerIds() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting comprehensive Ledger ID fix...");
        const profiles = yield prisma.staffProfile.findMany({
            include: { user: true }
        });
        const ledgers = yield prisma.ledger.findMany({
            where: { entity_type: 'USER' }
        });
        console.log(`Checking ${profiles.length} profiles against ${ledgers.length} ledgers...`);
        let fixedCount = 0;
        for (const p of profiles) {
            // Check if already linked correctly
            const exactMatch = ledgers.find(l => l.entity_id === p.user_id);
            if (!exactMatch) {
                // Check for name match (case-insensitive)
                // AND ensure the ledger isn't already linked to someone else (though unlikely if null)
                const nameMatch = ledgers.find(l => l.name.toLowerCase() === p.user.full_name.toLowerCase());
                if (nameMatch) {
                    if (nameMatch.entity_id && nameMatch.entity_id !== p.user_id) {
                        console.log(`[WARNING] Ledger '${nameMatch.name}' matches name but has DIFFERENT ID ${nameMatch.entity_id}. Skipping to avoid conflict.`);
                        continue;
                    }
                    console.log(`Fixing Ledger for '${p.user.full_name}':`);
                    console.log(`  - Ledger Name: ${nameMatch.name}`);
                    console.log(`  - Old Entity ID: ${nameMatch.entity_id}`);
                    console.log(`  - New Entity ID: ${p.user_id}`);
                    yield prisma.ledger.update({
                        where: { id: nameMatch.id },
                        data: { entity_id: p.user_id }
                    });
                    console.log(`  -> FIXED.\n`);
                    fixedCount++;
                }
            }
        }
        console.log(`\nDone. Fixed ${fixedCount} ledgers.`);
    });
}
fixAllLedgerIds()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
