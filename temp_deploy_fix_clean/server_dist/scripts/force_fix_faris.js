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
function forceFixFaris() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Force fixing Faris...");
        // 1. Get Faris
        const faris = yield prisma.user.findFirst({ where: { full_name: 'Faris' } });
        if (!faris)
            return console.log("Faris User not found");
        // 2. Get Ledger
        const ledger = yield prisma.ledger.findFirst({ where: { name: 'Faris' } });
        if (!ledger)
            return console.log("Faris Ledger not found");
        console.log(`Linking Ledger ${ledger.id} to User ${faris.id}`);
        yield prisma.ledger.update({
            where: { id: ledger.id },
            data: { entity_id: faris.id }
        });
        console.log("FIXED.");
    });
}
forceFixFaris()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
