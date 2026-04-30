import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const clients = await prisma.client.findMany();
    const staff = await prisma.user.findMany({
        where: { staffProfile: { isNot: null } },
        include: { staffProfile: true }
    });

    console.log(`Starting migration for ${clients.length} clients and ${staff.length} staff members...`);

    // 1. Migrate Clients
    for (const client of clients) {
        // Find ledgers for this client
        // Currently, they are identified by entity_type='CLIENT' and entity_id=client.id
        // Or by name if entity_id is missing.
        const ledgers = await prisma.ledger.findMany({
            where: {
                OR: [
                    { entity_type: 'CLIENT', entity_id: client.id },
                    { name: client.name, entity_type: 'CLIENT' }
                ]
            },
            include: { head: true }
        });

        if (ledgers.length > 0) {
            const incomeLedger = ledgers.find(l => l.head.type === 'INCOME');
            const expenseLedger = ledgers.find(l => l.head.type === 'EXPENSE');
            const assetLedger = ledgers.find(l => l.head.type === 'ASSET'); // Some clients are Assets (Receivables)

            // Check if already exists
            const existing = await prisma.ledgerMaster.findFirst({
                where: { entity_type: 'CLIENT', entity_id: client.id }
            });

            if (existing) {
                console.log(`Client ${client.name} already migrated. Skipping.`);
                continue;
            }

            // Create Unified Ledger
            const unified = await prisma.ledgerMaster.create({
                data: {
                    entity_type: 'CLIENT',
                    entity_id: client.id,
                    ledger_name: client.name,
                    ledger_type: 'unified'
                }
            });

            // Create Mapping
            await prisma.legacyLedgerMapping.create({
                data: {
                    new_ledger_id: unified.id,
                    old_income_ledger_id: incomeLedger?.id || assetLedger?.id, // Map Asset to Income slot for clients if no Income ledger
                    old_expense_ledger_id: expenseLedger?.id
                }
            });

            console.log(`Migrated client: ${client.name}`);
        }
    }

    // 2. Migrate Staff
    for (const s of staff) {
        const ledgers = await prisma.ledger.findMany({
            where: {
                OR: [
                    { entity_type: 'USER', entity_id: s.id },
                    { name: s.full_name, entity_type: 'USER' }
                ]
            },
            include: { head: true }
        });

        if (ledgers.length > 0) {
            const incomeLedger = ledgers.find(l => l.head.type === 'INCOME');
            const expenseLedger = ledgers.find(l => l.head.type === 'EXPENSE');
            const liabilityLedger = ledgers.find(l => l.head.type === 'LIABILITY'); // Staff are Liabilities (Payable)

            // Check if already exists
            const existing = await prisma.ledgerMaster.findFirst({
                where: { entity_type: 'USER', entity_id: s.id }
            });

            if (existing) {
                console.log(`Staff ${s.full_name} already migrated. Skipping.`);
                continue;
            }

            const unified = await prisma.ledgerMaster.create({
                data: {
                    entity_type: 'USER',
                    entity_id: s.id,
                    ledger_name: s.full_name,
                    ledger_type: 'unified'
                }
            });

            await prisma.legacyLedgerMapping.create({
                data: {
                    new_ledger_id: unified.id,
                    old_income_ledger_id: incomeLedger?.id,
                    old_expense_ledger_id: expenseLedger?.id || liabilityLedger?.id // Map Liability to Expense slot for staff
                }
            });

            console.log(`Migrated staff: ${s.full_name}`);
        }
    }

    // 3. Create Master Expense Ledger if not exists
    const expenseLedger = await prisma.ledgerMaster.findFirst({
        where: { ledger_name: 'Master Expense Account', entity_type: 'GENERAL' }
    });

    if (!expenseLedger) {
        await prisma.ledgerMaster.create({
            data: {
                ledger_name: 'Master Expense Account',
                entity_type: 'GENERAL',
                ledger_type: 'unified'
            }
        });
        console.log('Created Master Expense Account.');
    }

    console.log('Migration complete.');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
