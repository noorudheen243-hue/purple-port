import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- GLOBAL UNIFIED MIGRATION START ---');

    const legacyLedgers = await prisma.ledger.findMany();
    console.log(`Found ${legacyLedgers.length} legacy ledgers.`);

    const migrationDate = new Date();

    for (const legacy of legacyLedgers) {
        const existingMapping = await prisma.legacyLedgerMapping.findFirst({
            where: {
                OR: [
                    { old_income_ledger_id: legacy.id },
                    { old_expense_ledger_id: legacy.id }
                ]
            }
        });

        if (existingMapping) {
            console.log(`Skipping ${legacy.name} (Already mapped).`);
            continue;
        }

        if (legacy.entity_type === 'CLIENT' && legacy.entity_id) {
            const otherLedger = await prisma.ledger.findFirst({
                where: {
                    entity_id: legacy.entity_id,
                    id: { not: legacy.id },
                    entity_type: 'CLIENT'
                }
            });

            const ledgerName = legacy.name.replace(' (Income)', '').replace(' (Expense)', '').trim();
            
            const master = await prisma.ledgerMaster.create({
                data: {
                    ledger_name: ledgerName,
                    entity_type: 'CLIENT',
                    entity_id: legacy.entity_id,
                    ledger_type: 'unified'
                }
            });

            const incomeId = legacy.name.includes('Income') ? legacy.id : (otherLedger?.id || null);
            const expenseId = legacy.name.includes('Expense') ? legacy.id : (otherLedger ? null : legacy.id);

            await (prisma.legacyLedgerMapping as any).create({
                data: {
                    new_ledger_id: master.id,
                    old_income_ledger_id: incomeId,
                    old_expense_ledger_id: expenseId,
                    migration_date: migrationDate
                }
            });
            console.log(`Migrated Client: ${ledgerName}`);
            continue;
        }

        if (legacy.entity_type === 'USER' && legacy.entity_id) {
            const master = await prisma.ledgerMaster.create({
                data: {
                    ledger_name: legacy.name,
                    entity_type: 'USER',
                    entity_id: legacy.entity_id,
                    ledger_type: 'unified'
                }
            });

            await (prisma.legacyLedgerMapping as any).create({
                data: {
                    new_ledger_id: master.id,
                    old_expense_ledger_id: legacy.id,
                    migration_date: migrationDate
                }
            });
            console.log(`Migrated Staff: ${legacy.name}`);
            continue;
        }

        const master = await prisma.ledgerMaster.create({
            data: {
                ledger_name: legacy.name,
                entity_type: legacy.entity_type === 'BANK' ? 'BANK' : 'GENERAL',
                ledger_type: 'unified',
                metadata: `Legacy Type: ${legacy.entity_type}`
            }
        });

        const gIncomeId = ['INCOME', 'BANK', 'CASH'].includes(legacy.entity_type) ? (legacy.id as any) : undefined;
        const gExpenseId = ['EXPENSE', 'ADJUSTMENT'].includes(legacy.entity_type) ? (legacy.id as any) : undefined;

        await (prisma.legacyLedgerMapping as any).create({
            data: {
                new_ledger_id: master.id,
                old_income_ledger_id: gIncomeId,
                old_expense_ledger_id: gExpenseId,
                migration_date: migrationDate
            }
        });
        console.log(`Migrated General: ${legacy.name}`);
    }

    console.log('--- GLOBAL UNIFIED MIGRATION COMPLETE ---');
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(() => prisma.$disconnect());
