import { PrismaClient } from '@prisma/client';
import { ensureLedger } from '../src/modules/accounting/service';

const prisma = new PrismaClient();

async function safeRepair() {
    console.log("--- Starting Safe Client Ledger Repair ---");
    
    const clients = await prisma.client.findMany();
    console.log(`Checking ${clients.length} clients.`);
    
    let createdCount = 0;
    
    for (const client of clients) {
        // Find if this client has any ledger at all
        const existingLedger = await prisma.ledger.findFirst({
            where: { entity_type: 'CLIENT', entity_id: client.id }
        });
        
        if (!existingLedger) {
            console.log(`[FIX] Creating missing ledger for ${client.name}...`);
            await ensureLedger('CLIENT', client.id, '1000');
            createdCount++;
        }
    }
    
    console.log(`Safe repair completed. New Ledgers Created: ${createdCount}`);
}

safeRepair()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
