import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING ACCOUNTING HARD RESET ---');

    // 1. Clear All Transactions
    console.log('Cleaning Transaction Pulse...');
    await prisma.unifiedTransaction.deleteMany({});
    await prisma.journalLine.deleteMany({});
    await prisma.journalEntry.deleteMany({});

    // 2. Clear All Ledger Mappings
    console.log('Cleaning Mapping Protocol...');
    await prisma.legacyLedgerMapping.deleteMany({});

    // 3. Clear All Ledgers
    console.log('Dissolving Existing Ledgers...');
    await prisma.ledgerMaster.deleteMany({});
    await prisma.ledger.deleteMany({});

    console.log('--- INITIALIZING FRESH ECOSYSTEM ---');

    // 4. Create Staff Ledgers (from existing Users)
    const users = await prisma.user.findMany();
    for (const user of users) {
        await prisma.ledgerMaster.create({
            data: {
                ledger_name: user.full_name || user.email,
                entity_type: 'USER',
                entity_id: user.id,
                ledger_type: 'unified'
            }
        });
        console.log(`Created Staff Ledger: ${user.full_name || user.email}`);
    }

    // 5. Create Client Ledgers (from existing Clients)
    const clients = await prisma.client.findMany();
    for (const client of clients) {
        await prisma.ledgerMaster.create({
            data: {
                ledger_name: client.name,
                entity_type: 'CLIENT',
                entity_id: client.id,
                ledger_type: 'unified'
            }
        });
        console.log(`Created Client Ledger: ${client.name}`);
    }

    // 6. Create Operating/Expense Ledgers (General)
    const operatingLedgers = [
        { name: 'Electricity', type: 'GENERAL' },
        { name: 'Office Rent', type: 'GENERAL' },
        { name: 'Accommodation Rent', type: 'GENERAL' },
        { name: 'Digital Asset', type: 'GENERAL' },
        { name: 'Drinking Water', type: 'GENERAL' },
        { name: 'Refreshment', type: 'GENERAL' },
        { name: 'Celebration', type: 'GENERAL' },
        { name: 'Transportation', type: 'GENERAL' },
        { name: 'Stationary', type: 'GENERAL' },
        { name: 'Meta Recharge', type: 'GENERAL' },
        { name: 'Service Charges', type: 'GENERAL' },
        { name: 'Campaign Recharge', type: 'GENERAL' },
        { name: 'Consultation Fee', type: 'GENERAL' },
        { name: 'Misc Income', type: 'GENERAL' },
        { name: 'Cash in Hand', type: 'CASH' },
        { name: 'Main Bank Account', type: 'BANK' }
    ];

    for (const led of operatingLedgers) {
        await prisma.ledgerMaster.create({
            data: {
                ledger_name: led.name,
                entity_type: led.type as any,
                ledger_type: 'unified'
            }
        });
        console.log(`Created Operating Ledger: ${led.name}`);
    }

    console.log('--- HARD RESET & INITIALIZATION COMPLETE ---');
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(() => prisma.$disconnect());
