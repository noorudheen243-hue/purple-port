import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

/**
 * Checks if the unified ledger system is enabled via system settings.
 */
export const isUnifiedLedgerEnabled = async () => {
    const setting = await prisma.systemSetting.findUnique({
        where: { key: 'UNIFIED_LEDGER_ENABLED' }
    });
    return setting?.value === 'true';
};

/**
 * Creates a new Unified Ledger (LedgerMaster) and optionally maps it to legacy ledgers.
 */
export const createUnifiedLedger = async (data: {
    entity_type: string;
    entity_id?: string;
    ledger_name: string;
    old_income_ledger_id?: string;
    old_expense_ledger_id?: string;
}) => {
    return prisma.$transaction(async (tx) => {
        const ledger = await tx.ledgerMaster.create({
            data: {
                entity_type: data.entity_type,
                entity_id: data.entity_id,
                ledger_name: data.ledger_name,
                ledger_type: 'unified'
            }
        });

        if (data.old_income_ledger_id || data.old_expense_ledger_id) {
            await tx.legacyLedgerMapping.create({
                data: {
                    new_ledger_id: ledger.id,
                    old_income_ledger_id: data.old_income_ledger_id,
                    old_expense_ledger_id: data.old_expense_ledger_id
                }
            });
        }

        return ledger;
    });
};

/**
 * Records a new transaction in the Unified Ledger system.
 */
export const recordUnifiedTransaction = async (data: {
    ledger_id: string;
    transaction_type: 'INCOME' | 'EXPENSE';
    amount: number;
    date: Date;
    description: string;
    reference?: string;
}) => {
    return prisma.unifiedTransaction.create({
        data: {
            ledger_id: data.ledger_id,
            transaction_type: data.transaction_type,
            amount: data.amount,
            date: data.date,
            description: data.description,
            reference: data.reference
        }
    });
};

/**
 * Fetches a unified statement by merging new transactions with legacy ledger data.
 */
export const getUnifiedStatement = async (ledger_id: string, startDate: Date, endDate: Date) => {
    const mapping = await prisma.legacyLedgerMapping.findFirst({
        where: { new_ledger_id: ledger_id }
    });

    const newTransactions = await prisma.unifiedTransaction.findMany({
        where: {
            ledger_id,
            date: { gte: startDate, lte: endDate }
        },
        orderBy: { date: 'asc' }
    });

    const legacyTransactions: any[] = [];

    if (mapping) {
        const migrationDate = mapping.migration_date;

        // Fetch Old Income Transactions (Only before migration)
        if (mapping.old_income_ledger_id) {
            const incomeLines = await prisma.journalLine.findMany({
                where: {
                    ledger_id: mapping.old_income_ledger_id,
                    entry: { 
                        date: { 
                            gte: startDate, 
                            lte: endDate,
                            lt: migrationDate // Only legacy data
                        } 
                    }
                },
                include: { entry: true }
            });
            incomeLines.forEach(line => {
                legacyTransactions.push({
                    id: line.id,
                    date: line.entry.date,
                    description: line.entry.description,
                    transaction_type: 'INCOME',
                    amount: Math.abs(line.debit - line.credit),
                    reference: line.entry.reference,
                    isLegacy: true
                });
            });
        }

        // Fetch Old Expense Transactions (Only before migration)
        if (mapping.old_expense_ledger_id) {
            const expenseLines = await prisma.journalLine.findMany({
                where: {
                    ledger_id: mapping.old_expense_ledger_id,
                    entry: { 
                        date: { 
                            gte: startDate, 
                            lte: endDate,
                            lt: migrationDate 
                        } 
                    }
                },
                include: { entry: true }
            });
            expenseLines.forEach(line => {
                legacyTransactions.push({
                    id: line.id,
                    date: line.entry.date,
                    description: line.entry.description,
                    transaction_type: 'EXPENSE',
                    amount: Math.abs(line.debit - line.credit),
                    reference: line.entry.reference,
                    isLegacy: true
                });
            });
        }
    }

    // Merge and Sort
    const all = [
        ...newTransactions.map(t => ({ ...t, isLegacy: false })),
        ...legacyTransactions
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return all;
};

/**
 * Calculates the unified balance based on the formula:
 * Balance = (Old Income + New Income) – (Old Expense + New Expense)
 */
export const calculateUnifiedBalance = async (ledger_id: string) => {
    const mapping = await prisma.legacyLedgerMapping.findFirst({
        where: { new_ledger_id: ledger_id }
    });

    const newAgg = await prisma.unifiedTransaction.groupBy({
        by: ['transaction_type'],
        where: { ledger_id },
        _sum: { amount: true }
    });

    let newIncome = 0;
    let newExpense = 0;

    newAgg.forEach(agg => {
        if (agg.transaction_type === 'INCOME') newIncome = agg._sum.amount || 0;
        if (agg.transaction_type === 'EXPENSE') newExpense = agg._sum.amount || 0;
    });

    let oldIncome = 0;
    let oldExpense = 0;

    if (mapping) {
        const migrationDate = mapping.migration_date;

        if (mapping.old_income_ledger_id) {
            // Sum legacy transactions BEFORE migration
            const incomeAgg = await prisma.journalLine.aggregate({
                where: {
                    ledger_id: mapping.old_income_ledger_id,
                    entry: { date: { lt: migrationDate } }
                },
                _sum: { debit: true, credit: true }
            });
            oldIncome = Math.abs((incomeAgg._sum.debit || 0) - (incomeAgg._sum.credit || 0));
        }
        if (mapping.old_expense_ledger_id) {
            const expenseAgg = await prisma.journalLine.aggregate({
                where: {
                    ledger_id: mapping.old_expense_ledger_id,
                    entry: { date: { lt: migrationDate } }
                },
                _sum: { debit: true, credit: true }
            });
            oldExpense = Math.abs((expenseAgg._sum.debit || 0) - (expenseAgg._sum.credit || 0));
        }
    }

    return (oldIncome + newIncome) - (oldExpense + newExpense);
};

export const getUnifiedLedgers = async () => {
    return prisma.ledgerMaster.findMany({
        include: { mappings: true },
        orderBy: { ledger_name: 'asc' }
    });
};
