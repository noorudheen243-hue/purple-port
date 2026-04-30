import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- REFINING LEDGER STRUCTURE ---');

    // 1. Rename "Electricity & Utilities" -> "Utilities"
    const utilLedger = await prisma.ledgerMaster.findFirst({
        where: { ledger_name: 'Electricity & Utilities' }
    });
    if (utilLedger) {
        await prisma.ledgerMaster.update({
            where: { id: utilLedger.id },
            data: { ledger_name: 'Utilities' }
        });
        console.log('Renamed: Electricity & Utilities -> Utilities');
    }

    // 2. Create "Electricity" ledger
    const existingElec = await prisma.ledgerMaster.findFirst({ where: { ledger_name: 'Electricity' } });
    if (!existingElec) {
        await prisma.ledgerMaster.create({
            data: {
                ledger_name: 'Electricity',
                entity_type: 'GENERAL',
                ledger_type: 'unified'
            }
        });
        console.log('Created: Electricity');
    }

    // 3. Create "Office Rent" and "Accommodation Rent"
    const rentLedgers = ['Office Rent', 'Accommodation Rent'];
    for (const name of rentLedgers) {
        const exists = await prisma.ledgerMaster.findFirst({ where: { ledger_name: name } });
        if (!exists) {
            await prisma.ledgerMaster.create({
                data: {
                    ledger_name: name,
                    entity_type: 'GENERAL',
                    ledger_type: 'unified'
                }
            });
            console.log(`Created: ${name}`);
        }
    }

    // 4. Create "Meta Ad Account"
    const metaLedger = await prisma.ledgerMaster.findFirst({ where: { ledger_name: 'Meta Ad Account' } });
    if (!metaLedger) {
        await prisma.ledgerMaster.create({
            data: {
                ledger_name: 'Meta Ad Account',
                entity_type: 'GENERAL',
                ledger_type: 'unified'
            }
        });
        console.log('Created: Meta Ad Account');
    }

    console.log('--- LEDGER REFINEMENT COMPLETE ---');
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(() => prisma.$disconnect());
