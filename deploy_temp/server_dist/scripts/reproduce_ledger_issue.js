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
const service_1 = require("../modules/team/service");
const prisma = new client_1.PrismaClient();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Get a Staff Member (e.g., random one)
        const staff = yield prisma.staffProfile.findFirst({
            include: { user: true }
        });
        if (!staff) {
            console.log("No staff found.");
            return;
        }
        console.log(`Testing with staff: ${staff.user.full_name} (${staff.id})`);
        // 2. Get an Account Head (Any Liability)
        const head = yield prisma.accountHead.findFirst({
            where: { type: 'LIABILITY' }
        });
        if (!head) {
            console.log("No Liability Head found.");
            return;
        }
        console.log(`Using Head: ${head.name} (${head.code}) ID: ${head.id}`);
        // 3. Call Service
        console.log("Calling updateStaffFull with ledger creation...");
        try {
            yield (0, service_1.updateStaffFull)(staff.id, {}, // No user updates
            {}, // No profile updates
            { create: true, head_id: head.id });
            console.log("Service call completed.");
        }
        catch (e) {
            console.error("Service call failed:", e);
        }
        // 4. Verify
        const ledgers = yield prisma.ledger.findMany({
            where: { entity_type: 'USER', entity_id: staff.user_id }
        });
        console.log("Ledgers found for user:", ledgers);
    });
}
run()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
