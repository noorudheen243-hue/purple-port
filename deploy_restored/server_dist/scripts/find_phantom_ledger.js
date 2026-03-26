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
function findPhantomLedger() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Searching for 'Faris' in ALL Ledgers...");
        // 1. Get Faris user ID
        const farisProfile = yield prisma.staffProfile.findFirst({
            where: { user: { full_name: { contains: 'Faris' } } },
            include: { user: true }
        });
        if (!farisProfile) {
            console.log("CRITICAL: Staff profile for 'Faris' NOT FOUND!");
            return;
        }
        console.log(`Target Staff: ${farisProfile.user.full_name} (ID: ${farisProfile.user_id})`);
        // 2. Fetch ALL Ledgers
        const allLedgers = yield prisma.ledger.findMany();
        console.log(`Scanning ${allLedgers.length} total ledgers...`);
        const matches = allLedgers.filter(l => l.name.toLowerCase().includes('faris') ||
            l.entity_id === farisProfile.user_id);
        if (matches.length === 0) {
            console.log("RESULT: ABSOLUTELY NO TRACE of 'Faris' in Ledgers table.");
            console.log("This confirms the creation FAILED or was skipped.");
        }
        else {
            console.log(`RESULT: Found ${matches.length} potential matches:`);
            matches.forEach(m => {
                console.log(` - ID: ${m.id}`);
                console.log(`   Name: "${m.name}"`);
                console.log(`   Type: ${m.entity_type}`);
                console.log(`   EntityID: ${m.entity_id}`);
                console.log(`   HeadID: ${m.head_id}`);
            });
        }
    });
}
findPhantomLedger()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
