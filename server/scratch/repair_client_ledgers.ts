import { PrismaClient } from '@prisma/client';
import { ensureLedger } from '../src/modules/accounting/service';

const prisma = new PrismaClient();

async function repair() {
    console.log("--- Starting Client Ledger Repair ---");
    
    const clients = await prisma.client.findMany();
    console.log(`Found ${clients.length} clients to check.`);
    
    let repairedCount = 0;
    let upgradedCount = 0;
    let collisionsResolved = 0;
    
    for (const client of clients) {
        // 1. Find all ledgers for this client
        const ledgers = await prisma.ledger.findMany({
            where: { entity_type: 'CLIENT', entity_id: client.id }
        });
        
        const assetHead = await prisma.accountHead.findUnique({ where: { code: '1000' } });
        if (!assetHead) {
            console.error("Asset head 1000 not found. Aborting.");
            return;
        }

        const head1000Ledger = ledgers.find(l => l.head_id === assetHead.id);
        const head4000Ledger = ledgers.find(l => {
            // We need to fetch the head code for each to be sure
            return false; // placeholder for below logic
        });
        
        // Let's do it properly per ledger
        for (const l of ledgers) {
            const head = await prisma.accountHead.findUnique({ where: { id: l.head_id } });
            if (head && head.code === '4000') {
                // Check if we already have one in 1000
                const alreadyHas1000 = ledgers.find(lx => lx.id !== l.id && lx.head_id === assetHead.id);
                
                if (alreadyHas1000) {
                    console.log(`[COLLISION] Client ${client.name} has ledgers in both 4000 and 1000. Merging...`);
                    // Merge balance if any? For now just delete the 4000 one if 1000 exists
                    // Actually, moving transactions is safer but complex for a script.
                    // If balance is 0 on 4000, just delete it.
                    if (l.balance === 0) {
                        await prisma.ledger.delete({ where: { id: l.id } });
                        collisionsResolved++;
                    } else {
                        // Transfer balance...
                        await prisma.ledger.update({
                            where: { id: alreadyHas1000.id },
                            data: { balance: { increment: l.balance } }
                        });
                        await prisma.ledger.delete({ where: { id: l.id } });
                        collisionsResolved++;
                    }
                } else {
                   try {
                        console.log(`[UPGRADE] Moving ledger for ${client.name} from head 4000 to 1000...`);
                        await prisma.ledger.update({
                            where: { id: l.id },
                            data: { head_id: assetHead.id }
                        });
                        upgradedCount++;
                   } catch (e) {
                        console.error(`Failed to upgrade ledger for ${client.name}:`, e);
                   }
                }
            }
        }
        
        // Re-check after potential upgrades/merges if client has a 1000 ledger
        const finalLedgers = await prisma.ledger.findMany({
            where: { entity_type: 'CLIENT', entity_id: client.id }
        });
        if (!finalLedgers.some(l => l.head_id === assetHead.id)) {
            console.log(`[FIX] Creating missing ledger for ${client.name}...`);
            await ensureLedger('CLIENT', client.id, '1000');
            repairedCount++;
        }
    }
    
    console.log(`Repair completed.`);
    console.log(`New Ledgers Created: ${repairedCount}`);
    console.log(`Ledgers Standardized to Head 1000: ${upgradedCount}`);
    console.log(`Collisions Resolved: ${collisionsResolved}`);
}

repair()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
