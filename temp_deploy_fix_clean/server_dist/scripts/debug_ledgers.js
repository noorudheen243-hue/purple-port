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
function checkStaffLedgers() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Fetching staff profiles...");
        const profiles = yield prisma.staffProfile.findMany({
            include: { user: true }
        });
        console.log(`Found ${profiles.length} staff profiles.`);
        const userIds = profiles.map(p => p.user_id);
        console.log("Checking for Ledgers with entity_type='USER'...");
        const ledgers = yield prisma.ledger.findMany({
            where: {
                entity_type: 'USER',
                entity_id: { in: userIds }
            }
        });
        console.log(`Found ${ledgers.length} linked ledgers.`);
        profiles.forEach(p => {
            const ledger = ledgers.find(l => l.entity_id === p.user_id);
            if (ledger) {
                console.log(`[YES] ${p.user.full_name} (${p.designation}) - Ledger found.`);
            }
            else {
                console.log(`[NO]  ${p.user.full_name} (${p.designation}) - No Ledger.`);
            }
        });
    });
}
checkStaffLedgers()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield prisma.$disconnect(); }));
