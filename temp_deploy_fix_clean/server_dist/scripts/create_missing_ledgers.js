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
const service_1 = require("../modules/accounting/service");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting Ledger Backfill...");
        const clients = yield prisma.client.findMany();
        console.log(`Found ${clients.length} clients.`);
        let created = 0;
        let skipped = 0;
        for (const client of clients) {
            const existing = yield prisma.ledger.findFirst({
                where: {
                    entity_type: 'CLIENT',
                    entity_id: client.id
                }
            });
            if (!existing) {
                console.log(`Creating ledger for: ${client.name}`);
                try {
                    // Determine group based on client type or default to Sundry Debtors
                    // Using '4000' (Revenue/Income) or '1200' (Receivable)?
                    // In service.ts: await ensureLedger('CLIENT', client.id, '4000');
                    // Let's stick to the service default pattern.
                    // Actually ensureLedger needs a headCode.
                    // In service.ts updateClient -> defaults to '4000' (Direct Income) or '1000' (Assets/Receivable?)
                    // Let's check service.ts usage again.
                    // Line 127 in service.ts: await ensureLedger('CLIENT', client.id, '4000');
                    yield (0, service_1.ensureLedger)('CLIENT', client.id, '4000');
                    created++;
                }
                catch (error) {
                    console.error(`Failed to create for ${client.name}:`, error);
                }
            }
            else {
                // console.log(`Skipping ${client.name}, ledger exists.`);
                skipped++;
            }
        }
        console.log(`Backfill Complete. Created: ${created}, Skipped: ${skipped}`);
    });
}
main()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield prisma.$disconnect(); }));
