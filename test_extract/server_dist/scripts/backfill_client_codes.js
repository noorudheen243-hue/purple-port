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
        console.log("Starting Client Code Backfill...");
        // Fetch all clients ordered by creation date
        const clients = yield prisma.client.findMany({
            orderBy: { createdAt: 'asc' }
        });
        console.log(`Found ${clients.length} clients to process.`);
        // 1. Build Registry of used codes
        const usedCodes = new Set(clients.map(c => c.client_code).filter(c => c));
        let counter = 1;
        for (const client of clients) {
            if (client.client_code)
                continue;
            // Find next free code
            let candidate = `QCN${counter.toString().padStart(4, '0')}`;
            while (usedCodes.has(candidate)) {
                counter++;
                candidate = `QCN${counter.toString().padStart(4, '0')}`;
            }
            // Found one
            yield prisma.client.update({
                where: { id: client.id },
                data: { client_code: candidate }
            });
            console.log(`Updated ${client.name} -> ${candidate}`);
            usedCodes.add(candidate);
            // Optimistically increment for next iteration to reduce while-loop hits
            counter++;
        }
        console.log("Backfill complete.");
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
