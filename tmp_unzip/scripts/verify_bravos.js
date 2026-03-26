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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Searching for Client 'Bravos'...");
        // Find Client (try name or brand_name if updated or company_name)
        // The exact field name depends on schema, let's try finding by partial name
        const clients = yield prisma.client.findMany({
            where: {
                name: { contains: 'Bravos' }
            }
        });
        if (clients.length === 0) {
            console.log("No client found with name containing 'Bravos'");
            return;
        }
        const bravos = clients[0];
        console.log("Found Client:", bravos.id, bravos.name);
        console.log("Searching for Ledger linked to this Client...");
        const linkedLedger = yield prisma.ledger.findFirst({
            where: {
                entity_type: 'CLIENT',
                entity_id: bravos.id
            }
        });
        if (linkedLedger) {
            console.log("Found Linked Ledger:", linkedLedger.id, linkedLedger.name, "Balance:", linkedLedger.balance);
        }
        else {
            console.log("CRITICAL: No Ledger found with entity_id =", bravos.id);
            // Try finding by name
            console.log("Searching for Ledger by Name 'Bravos'...");
            const nameLedger = yield prisma.ledger.findFirst({
                where: {
                    name: { contains: 'Bravos' }
                }
            });
            if (nameLedger) {
                console.log("Found Unlinked Ledger by Name:", nameLedger.id, nameLedger.name, "EntityID:", nameLedger.entity_id);
                console.log("Attempting to Fix Link...");
                yield prisma.ledger.update({
                    where: { id: nameLedger.id },
                    data: {
                        entity_type: 'CLIENT',
                        entity_id: bravos.id
                    }
                });
                console.log("Link Fixed!");
            }
            else {
                console.log("No Ledger found by name either.");
            }
        }
        // Check Transactions
        if (linkedLedger) {
            const txs = yield prisma.journalEntry.findMany({
                where: {
                    lines: {
                        some: {
                            ledger_id: linkedLedger.id
                        }
                    }
                },
                include: { lines: true }
            });
            console.log(`Found ${txs.length} transactions for this ledger.`);
        }
    });
}
main()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield prisma.$disconnect(); }));
