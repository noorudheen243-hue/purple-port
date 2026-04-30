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
        { name: 'Electricity & Utilities', type: 'GENERAL' },
        { name: 'Office Rent', type: 'GENERAL' },
        { name: 'Digital Assets (Software/Subs)', type: 'GENERAL' },
        { name: 'Asset Purchase (Hardware/Furniture)', type: 'GENERAL' },
        { name: 'Drinking Water', type: 'GENERAL' },
        { name: 'Refreshment & Snacks', type: 'GENERAL' },
        { name: 'Celebrations & Team Events', type: 'GENERAL' },
        { name: 'Transportation & Travel', type: 'GENERAL' },
        { name: 'Office Stationary', type: 'GENERAL' },
        { name: 'Other Service Charges (Income)', type: 'GENERAL' },
        { name: 'Bank Charges', type: 'GENERAL' },
        { name: 'Miscellaneous Expenses', type: 'GENERAL' },
        { name: 'Cash in Hand', type: 'GENERAL' },
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
