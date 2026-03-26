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
function debugStaffLedgers() {
    return __awaiter(this, void 0, void 0, function* () {
        const profiles = yield prisma.staffProfile.findMany({
            include: { user: true }
        });
        const ledgers = yield prisma.ledger.findMany({
            where: { entity_type: 'USER' }
        });
        console.log(`Found ${profiles.length} profiles and ${ledgers.length} USER ledgers.`);
        profiles.forEach(p => {
            // Find ledger by matching User ID
            const matchedById = ledgers.find(l => l.entity_id === p.user_id);
            // Find ledger by matching Name (loose check)
            const matchedByName = ledgers.find(l => l.name.toLowerCase() === p.user.full_name.toLowerCase());
            console.log(`\nStaff: ${p.user.full_name} (${p.designation})`);
            console.log(`  - User ID: ${p.user_id}`);
            console.log(`  - Linked Ledger (ID Match): ${matchedById ? `YES [${matchedById.name}]` : 'NO'}`);
            if (!matchedById && matchedByName) {
                console.log(`  - WARNING: Found Ledger by Name '${matchedByName.name}' but ID mismatch!`);
                console.log(`    -> Ledger Entity ID: ${matchedByName.entity_id}`);
                console.log(`    -> Expected User ID: ${p.user_id}`);
            }
        });
    });
}
debugStaffLedgers()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
