import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- FIXING RENT LEDGERS ---');
    
    // Rename 'Rent' to 'Office Rent'
    const rentLedger = await prisma.ledgerMaster.findFirst({ where: { ledger_name: 'Rent' } });
    if (rentLedger) {
        await prisma.ledgerMaster.update({
            where: { id: rentLedger.id },
            data: { ledger_name: 'Office Rent' }
        });
        console.log('✅ Renamed Rent to Office Rent');
    } else {
        console.log('ℹ️ Rent ledger not found (might already be renamed).');
    }

    // Create 'Accommodation Rent'
    const exists = await prisma.ledgerMaster.findFirst({ where: { ledger_name: 'Accommodation Rent' } });
    if (!exists) {
        await prisma.ledgerMaster.create({
            data: {
                ledger_name: 'Accommodation Rent',
                entity_type: 'GENERAL',
                ledger_type: 'unified'
            }
        });
        console.log('✅ Created Accommodation Rent');
    } else {
        console.log('ℹ️ Accommodation Rent already exists.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
