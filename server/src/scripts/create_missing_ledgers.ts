
import { syncEntityLedgers } from '../modules/accounting/service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log(">>> Starting Ledger Sync...");
    try {
        const result = await syncEntityLedgers();
        console.log(">>> Sync Complete:");
        console.log(`>>> New Ledgers Created: ${result.new_ledgers}`);
        console.log(">>> All Staff and Clients should now have ledgers.");
    } catch (error) {
        console.error(">>> Sync Failed:", error);
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
