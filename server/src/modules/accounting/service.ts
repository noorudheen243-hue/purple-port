import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { generateTransactionId } from '../../utils/transactionIdGenerator';
import { generateLedgerCode } from '../../utils/ledgerIdGenerator';

export type LedgerType = 'CLIENT' | 'VENDOR' | 'BANK' | 'CASH' | 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' | 'INTERNAL';

// --- LEGACY ACCOUNTING CORE ---

export const createLedger = async (data: {
    name: string;
    head_id: string;
    entity_type: string;
    entity_id?: string;
    description?: string;
    opening_balance?: number;
    opening_balance_date?: Date;
}) => {
    return prisma.$transaction(async (tx) => {
        const ledgerCode = await generateLedgerCode(tx);
        const ledger = await tx.ledger.create({
            data: {
                ledger_code: ledgerCode,
                name: data.name,
                head_id: data.head_id,
                entity_type: data.entity_type,
                entity_id: data.entity_id,
                description: data.description,
                status: 'ACTIVE',
                balance: 0
            }
        });

        if (data.opening_balance && data.opening_balance > 0) {
            const adjustmentLedger = await tx.ledger.findFirst({
                where: { name: 'Opening Balance Adjustment' }
            });
            if (!adjustmentLedger) throw new Error("System Ledger 'Opening Balance Adjustment' not found.");

            const head = await tx.accountHead.findUnique({ where: { id: data.head_id } });
            if (!head) throw new Error("Account Head not found");

            const isDebitNature = ['ASSET', 'EXPENSE'].includes(head.type);
            let debitLedgerId = isDebitNature ? ledger.id : adjustmentLedger.id;
            let creditLedgerId = isDebitNature ? adjustmentLedger.id : ledger.id;

            await createJournalEntry(tx, {
                date: data.opening_balance_date || new Date(),
                description: `Opening Balance for ${ledger.name}`,
                amount: data.opening_balance,
                type: 'JOURNAL',
                debit_ledger_id: debitLedgerId,
                credit_ledger_id: creditLedgerId,
                reference: 'OPENING_BAL'
            });
        }
        return ledger;
    });
};

export const createJournalEntry = async (
    tx: Prisma.TransactionClient,
    data: {
        date: Date;
        description: string;
        amount: number;
        type: string;
        debit_ledger_id?: string;
        credit_ledger_id?: string;
        reference?: string;
        nature?: string;
        invoice_id?: string;
        created_by_id?: string;
        lines?: { ledger_id: string; debit: number; credit: number }[];
    }
) => {
    const transactionId = await generateTransactionId(tx);
    const entry = await tx.journalEntry.create({
        data: {
            date: data.date,
            description: data.description,
            amount: data.amount,
            type: data.type,
            reference: data.reference,
            nature: data.nature || 'GENERAL',
            // @ts-ignore
            transaction_number: transactionId,
            created_by_id: data.created_by_id || 'SYSTEM',
            invoice: data.invoice_id ? { connect: { id: data.invoice_id } } : undefined
        }
    });

    const linesToCreate = [];
    if (data.debit_ledger_id && data.credit_ledger_id) {
        linesToCreate.push({ ledger_id: data.debit_ledger_id, debit: data.amount, credit: 0 });
        linesToCreate.push({ ledger_id: data.credit_ledger_id, debit: 0, credit: data.amount });
    }
    if (data.lines && data.lines.length > 0) {
        linesToCreate.push(...data.lines);
    }

    if (linesToCreate.length === 0) throw new Error("Journal Entry must have at least 2 lines.");

    for (const line of linesToCreate) {
        await tx.journalLine.create({
            data: {
                entry_id: entry.id,
                ledger_id: line.ledger_id,
                debit: line.debit,
                credit: line.credit
            }
        });

        if (line.debit > 0) {
            await tx.ledger.update({
                where: { id: line.ledger_id },
                data: { balance: { increment: line.debit } }
            });
        }
        if (line.credit > 0) {
            await tx.ledger.update({
                where: { id: line.ledger_id },
                data: { balance: { decrement: line.credit } }
            });
        }
    }

    // Unified Sync (Corrected: Outside the loop, syncing all mapped lines)
    await syncJournalEntryToUnified(tx, entry, linesToCreate);

    return entry;
};

/**
 * Syncs a single Journal Entry and its lines to the Unified Ledger system.
 * This is a standalone function that can be used for both live sync and repairs.
 */
export const syncJournalEntryToUnified = async (
    tx: Prisma.TransactionClient,
    entry: { id: string; date: Date; description: string; reference?: string | null },
    lines: { ledger_id: string; debit: number; credit: number }[]
) => {
    const isUnifiedEnabled = await tx.systemSetting.findUnique({ where: { key: 'UNIFIED_LEDGER_ENABLED' } });
    if (isUnifiedEnabled?.value !== 'true') return;

    for (const line of lines) {
        const mapping = await tx.legacyLedgerMapping.findFirst({
            where: {
                OR: [
                    { old_income_ledger_id: line.ledger_id },
                    { old_expense_ledger_id: line.ledger_id }
                ]
            }
        });

        if (mapping) {
            const ledger = await tx.ledger.findUnique({
                where: { id: line.ledger_id },
                include: { head: true }
            });

            if (ledger && ledger.head) {
                // EXCLUSION LOGIC: Only sync P&L impacting accounts (Income/Expense)
                // This ensures "Single Entry" behavior for the dashboard.
                if (ledger.head.type !== 'INCOME' && ledger.head.type !== 'EXPENSE') {
                    continue;
                }

                let unifiedType: 'INCOME' | 'EXPENSE';
                if (ledger.head.type === 'EXPENSE') {
                    unifiedType = line.debit > 0 ? 'EXPENSE' : 'INCOME';
                } else {
                    // INCOME head
                    unifiedType = line.credit > 0 ? 'INCOME' : 'EXPENSE';
                }

                const amount = Math.abs(line.debit - line.credit);
                if (amount > 0) {
                    // Use a deterministic reference for idempotency: LE:ENTRY_ID:LEDGER_ID
                    const uniqueRef = `LE:${entry.id}:${line.ledger_id}`;
                    
                    // Check if already exists to prevent duplicates during live sync
                    const existing = await tx.unifiedTransaction.findFirst({
                        where: { reference: uniqueRef }
                    });

                    if (!existing) {
                        await tx.unifiedTransaction.create({
                            data: {
                                ledger_id: mapping.new_ledger_id,
                                transaction_type: unifiedType,
                                amount,
                                date: entry.date,
                                description: entry.description,
                                reference: uniqueRef
                            }
                        });
                    }
                }
            }
        }
    }
};

/**
 * Repairs the Unified Ledger system by:
 * 1. Ensuring all legacy ledgers are mapped to unified ones.
 * 2. Retroactively syncing any JournalEntry that doesn't have a corresponding UnifiedTransaction.
 */
export const repairUnifiedSync = async () => {
    console.log("[REPAIR_SYNC] Starting high-performance system repair...");
    
    // 1. Ensure all ledgers are mapped
    try {
        await syncEntityLedgers();
    } catch (error) {
        console.error("[REPAIR_SYNC] Ledger sync error:", error);
    }

    // 2. Sync missing transactions using high-speed batching
    const entries = await prisma.journalEntry.findMany({
        include: { lines: true }
    });

    // Pre-fetch all existing unified references starting with LE: to avoid N+1 queries
    const existingRefs = await prisma.unifiedTransaction.findMany({
        where: { reference: { startsWith: 'LE:' } },
        select: { reference: true }
    });
    const refSet = new Set(existingRefs.map(r => r.reference));

    let syncedCount = 0;
    let errorCount = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        
        await prisma.$transaction(async (tx) => {
            for (const entry of batch) {
                try {
                    // Check if any of this entry's lines (that are P&L impacting) are missing from unified
                    const entryNeedsSync = entry.lines.some(line => {
                        // We only care about syncing the P&L impacting lines
                        // We need the head to know the type, so we'll check it in the sync function
                        // But for the check here, we'll be more inclusive and let syncJournalEntryToUnified filter it.
                        return !refSet.has(`LE:${entry.id}:${line.ledger_id}`);
                    });
                    
                    if (entryNeedsSync) {
                        await syncJournalEntryToUnified(tx, entry, entry.lines);
                        syncedCount++;
                    }
                } catch (err) {
                    errorCount++;
                    console.error(`[REPAIR_SYNC] Batch error on entry ${entry.id}:`, err);
                }
            }
        }, {
            timeout: 30000 // 30s timeout for SQLite batch
        });
        
        if (syncedCount % 100 === 0) console.log(`[REPAIR_SYNC] Progress: ${i}/${entries.length} checked...`);
    }

    console.log(`[REPAIR_SYNC] Repair complete. Synced: ${syncedCount}, Errors: ${errorCount}`);

    return { 
        message: "Repair complete", 
        syncedEntries: syncedCount,
        totalEntries: entries.length,
        errors: errorCount
    };
};

// --- UNIFIED LEDGER SYSTEM ---

export const isUnifiedLedgerEnabled = async () => {
    const setting = await prisma.systemSetting.findUnique({
        where: { key: 'UNIFIED_LEDGER_ENABLED' }
    });
    return setting?.value === 'true';
};

export const createUnifiedLedger = async (data: {
    entity_type: string;
    entity_id?: string;
    ledger_name: string;
    metadata?: string;
    old_income_ledger_id?: string;
    old_expense_ledger_id?: string;
}) => {
    return prisma.$transaction(async (tx) => {
        const ledger = await tx.ledgerMaster.create({
            data: {
                entity_type: data.entity_type,
                entity_id: data.entity_id,
                ledger_name: data.ledger_name,
                ledger_type: 'unified',
                metadata: data.metadata
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

export const updateUnifiedLedger = async (id: string, data: any) => {
    return await prisma.ledgerMaster.update({
        where: { id },
        data: {
            ledger_name: data.ledger_name,
            metadata: data.metadata
        }
    });
};

export const deleteUnifiedLedger = async (id: string) => {
    const txCount = await prisma.unifiedTransaction.count({ where: { ledger_id: id } });
    if (txCount > 0) throw new Error('Cannot delete ledger with existing transactions.');
    return await prisma.ledgerMaster.delete({ where: { id } });
};

export const getUnifiedLedgers = async (type?: string) => {
    const ledgers = await prisma.ledgerMaster.findMany({
        where: type ? { entity_type: type } : {},
        include: { mappings: true },
        orderBy: { ledger_name: 'asc' }
    });

    // Staff users: active users who are NOT CLIENT-role
    const staffUsers = await prisma.user.findMany({
        where: { status: 'ACTIVE', role: { not: 'CLIENT' } },
        select: { id: true }
    });
    const staffUserIds = new Set(staffUsers.map(u => u.id));

    const activeClients = await prisma.client.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    const activeClientIds = new Set(activeClients.map(c => c.id));

    return ledgers.filter(ledger => {
        if (ledger.entity_type === 'USER' || ledger.entity_type === 'TEAM') {
            // Only show ledgers linked to actual staff members (non-CLIENT role)
            return !ledger.entity_id || staffUserIds.has(ledger.entity_id);
        }
        if (ledger.entity_type === 'CLIENT') {
            return !ledger.entity_id || activeClientIds.has(ledger.entity_id);
        }
        return true;
    });
};

export const recordUnifiedTransaction = async (data: {
    ledger_id: string;
    transaction_type: 'INCOME' | 'EXPENSE';
    category?: string;
    sub_type?: string;
    amount: number;
    date: Date;
    description: string;
    reference?: string;
    payroll_slip_id?: string;
}) => {
    return prisma.$transaction(async (tx) => {
        const transaction = await tx.unifiedTransaction.create({
            data: {
                ledger_id: data.ledger_id,
                transaction_type: data.transaction_type,
                category: data.category,
                sub_type: data.sub_type,
                amount: data.amount,
                date: data.date,
                description: data.description,
                reference: data.reference || (data.payroll_slip_id ? `PAYROLL_SLIP:${data.payroll_slip_id}` : undefined)
            }
        });

        // Requirement: Auto-fetch advance salary in next payroll
        if (data.sub_type === 'Advance Salary' || data.category === 'Salary Advance' || data.category === 'Advance') {
            const ledger = await tx.ledgerMaster.findUnique({ where: { id: data.ledger_id } });
            if (ledger && (ledger.entity_type === 'USER' || ledger.entity_type === 'TEAM') && ledger.entity_id) {
                await tx.user.update({
                    where: { id: ledger.entity_id },
                    data: { advance_balance: { increment: data.amount } }
                });
            }
        }

        if (data.payroll_slip_id && (data.category === 'Staff Salary' || data.category === 'Monthly Payroll')) {
            await tx.payrollSlip.update({
                where: { id: data.payroll_slip_id },
                data: { status: 'PAID', payment_date: data.date }
            });
        }

        return transaction;
    });
};

export const deleteUnifiedTransaction = async (id: string) => {
    return prisma.$transaction(async (tx) => {
        const transaction = await tx.unifiedTransaction.findUnique({ 
            where: { id },
            include: { ledger: true }
        });
        if (!transaction) throw new Error("Transaction not found");

        // 1. Revert Payroll Status if linked
        const slipId = transaction.reference?.startsWith('PAYROLL_SLIP:') ? transaction.reference.split(':')[1] : null;
        if (slipId) {
            await tx.payrollSlip.update({
                where: { id: slipId },
                data: { status: 'PENDING', payment_date: null }
            });
        }

        // 2. Revert Advance Balance if any
        if (transaction.sub_type === 'Advance Salary' || transaction.category === 'Salary Advance' || transaction.category === 'Advance') {
            if (transaction.ledger && transaction.ledger.entity_id) {
                await tx.user.update({
                    where: { id: transaction.ledger.entity_id },
                    data: { advance_balance: { decrement: transaction.amount } }
                });
            }
        }

        return tx.unifiedTransaction.delete({ where: { id } });
    });
};

export const updateUnifiedTransaction = async (id: string, data: any) => {
    return prisma.unifiedTransaction.update({
        where: { id },
        data: {
            amount: data.amount,
            description: data.description,
            category: data.category,
            date: data.date ? new Date(data.date) : undefined,
            transaction_type: data.transaction_type
        }
    });
};

// --- ANALYTICS & REPORTS ---

async function calculateUnifiedBalanceAtDate(ledger_id: string, date: Date) {
    const mapping = await prisma.legacyLedgerMapping.findFirst({ where: { new_ledger_id: ledger_id } });
    const newAgg = await prisma.unifiedTransaction.groupBy({
        by: ['transaction_type'],
        where: { ledger_id, date: { lt: date } },
        _sum: { amount: true }
    });

    let income = 0;
    let expense = 0;

    newAgg.forEach(agg => {
        if (agg.transaction_type === 'INCOME') income = agg._sum.amount || 0;
        if (agg.transaction_type === 'EXPENSE') expense = agg._sum.amount || 0;
    });

    if (mapping) {
        const migrationDate = mapping.migration_date;
        const effectiveDate = date < migrationDate ? date : migrationDate;

        if (mapping.old_income_ledger_id) {
            const incomeAgg = await prisma.journalLine.aggregate({
                where: { ledger_id: mapping.old_income_ledger_id, entry: { date: { lt: effectiveDate } } },
                _sum: { debit: true, credit: true }
            });
            income += Math.abs((incomeAgg._sum.debit || 0) - (incomeAgg._sum.credit || 0));
        }
        if (mapping.old_expense_ledger_id) {
            const expenseAgg = await prisma.journalLine.aggregate({
                where: { ledger_id: mapping.old_expense_ledger_id, entry: { date: { lt: effectiveDate } } },
                _sum: { debit: true, credit: true }
            });
            expense += Math.abs((expenseAgg._sum.debit || 0) - (expenseAgg._sum.credit || 0));
        }
    }
    return income - expense;
}

export const calculateUnifiedBalance = async (ledger_id: string) => {
    return calculateUnifiedBalanceAtDate(ledger_id, new Date('2099-12-31'));
};

export const getUnifiedStatement = async (ledger_id: string, startDate: Date, endDate: Date) => {
    const mapping = await prisma.legacyLedgerMapping.findFirst({ where: { new_ledger_id: ledger_id } });
    const newTransactions = await prisma.unifiedTransaction.findMany({
        where: { ledger_id, date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'asc' }
    });

    const legacyTransactions: any[] = [];
    if (mapping) {
        const migrationDate = mapping.migration_date;
        if (mapping.old_income_ledger_id) {
            const lines = await prisma.journalLine.findMany({
                where: { ledger_id: mapping.old_income_ledger_id, entry: { date: { gte: startDate, lte: endDate, lt: migrationDate } } },
                include: { entry: true }
            });
            lines.forEach(line => legacyTransactions.push({ id: line.id, date: line.entry.date, description: line.entry.description, transaction_type: 'INCOME', amount: Math.abs(line.debit - line.credit), isLegacy: true }));
        }
        if (mapping.old_expense_ledger_id) {
            const lines = await prisma.journalLine.findMany({
                where: { ledger_id: mapping.old_expense_ledger_id, entry: { date: { gte: startDate, lte: endDate, lt: migrationDate } } },
                include: { entry: true }
            });
            lines.forEach(line => legacyTransactions.push({ id: line.id, date: line.entry.date, description: line.entry.description, transaction_type: 'EXPENSE', amount: Math.abs(line.debit - line.credit), isLegacy: true }));
        }
    }

    const all = [...newTransactions.map(t => ({ ...t, isLegacy: false })), ...legacyTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const openingBalance = await calculateUnifiedBalanceAtDate(ledger_id, startDate);
    let balance = openingBalance;

    const statementWithBalance = all.map(t => {
        if (t.transaction_type === 'INCOME') balance += t.amount;
        else balance -= t.amount;
        return { ...t, running_balance: balance };
    });

    return {
        transactions: statementWithBalance,
        openingBalance,
        closingBalance: balance,
        totalIncome: all.filter(t => t.transaction_type === 'INCOME').reduce((sum, t) => sum + t.amount, 0),
        totalExpense: all.filter(t => t.transaction_type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0)
    };
};

export const getUnifiedSummary = async (month?: number, year?: number) => {
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (year) {
        if (month) {
            // Specific Month
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59, 999);
        } else {
            // Specific Year
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
        }
    } else {
        // Default: Current Month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 1. Current Period Stats
    const incomeCurrent = await prisma.unifiedTransaction.aggregate({
        where: { transaction_type: 'INCOME', date: { gte: startDate, lte: endDate } },
        _sum: { amount: true }
    });

    const expenseCurrent = await prisma.unifiedTransaction.aggregate({
        where: { transaction_type: 'EXPENSE', date: { gte: startDate, lte: endDate } },
        _sum: { amount: true }
    });

    // 2. Opening Balance (Flow before startDate)
    const incomeBefore = await prisma.unifiedTransaction.aggregate({
        where: { transaction_type: 'INCOME', date: { lt: startDate } },
        _sum: { amount: true }
    });
    const expenseBefore = await prisma.unifiedTransaction.aggregate({
        where: { transaction_type: 'EXPENSE', date: { lt: startDate } },
        _sum: { amount: true }
    });

    // Include Legacy Mappings for Opening Balance
    const mappings = await prisma.legacyLedgerMapping.findMany();
    let legacyOpeningBalance = 0;
    for (const m of mappings) {
        const effectiveDate = startDate < m.migration_date ? startDate : m.migration_date;
        if (m.old_income_ledger_id) {
            const agg = await prisma.journalLine.aggregate({
                where: { ledger_id: m.old_income_ledger_id, entry: { date: { lt: effectiveDate } } },
                _sum: { debit: true, credit: true }
            });
            legacyOpeningBalance += Math.abs((agg._sum.debit || 0) - (agg._sum.credit || 0));
        }
        if (m.old_expense_ledger_id) {
            const agg = await prisma.journalLine.aggregate({
                where: { ledger_id: m.old_expense_ledger_id, entry: { date: { lt: effectiveDate } } },
                _sum: { debit: true, credit: true }
            });
            legacyOpeningBalance -= Math.abs((agg._sum.debit || 0) - (agg._sum.credit || 0));
        }
    }

    const openingBalance = (incomeBefore._sum.amount || 0) - (expenseBefore._sum.amount || 0) + legacyOpeningBalance;
    const netIncome = incomeCurrent._sum.amount || 0;
    const netExpense = expenseCurrent._sum.amount || 0;
    const grossIncome = openingBalance + netIncome;
    const monthBalance = netIncome - netExpense;
    const cashBankBalance = grossIncome - netExpense;

    // 3. Distribution Queries (Period-Filtered)
    const expenseCategories = await prisma.unifiedTransaction.groupBy({
        by: ['category'],
        where: { transaction_type: 'EXPENSE', date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5
    });

    const revenueCategories = await prisma.unifiedTransaction.groupBy({
        by: ['category'],
        where: { transaction_type: 'INCOME', date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5
    });

    return {
        openingBalance,
        netIncome,
        netExpense,
        grossIncome,
        monthBalance,
        cashBankBalance,
        expenseDistribution: expenseCategories.map(c => ({ label: c.category || 'General', value: c._sum.amount || 0 })),
        revenueDistribution: revenueCategories.map(c => ({ label: c.category || 'General', value: c._sum.amount || 0 })),
        netCashFlow: monthBalance, // Running month flow
        totalIncome: netIncome,
        totalExpense: netExpense
    };
};

export const getGlobalTransactionHistory = async (limit: number = 100) => {
    const unified = await prisma.unifiedTransaction.findMany({ take: limit, orderBy: { date: 'desc' }, include: { ledger: true } });
    
    // Fix: Use JournalEntry instead of JournalLine to avoid row duplication
    const legacyEntries = await prisma.journalEntry.findMany({ 
        take: limit, 
        orderBy: { date: 'desc' }, 
        include: { lines: { include: { ledger: { include: { head: true } } } } } 
    });

    // Create a set of synced legacy entry IDs to avoid double-showing in history
    // We extract the entryId from the new format: LE:entryId:ledgerId
    const syncedLegacyIds = new Set(
        unified
            .filter(t => t.reference?.startsWith('LE:'))
            .map(t => t.reference?.split(':')[1])
            .filter(Boolean)
    );

    const merged = [
        ...unified.map(t => ({
            id: t.id,
            date: t.date,
            description: t.description,
            transaction_type: t.transaction_type,
            category: t.category || 'General',
            amount: t.amount,
            ledger_name: t.ledger.ledger_name,
            entity_type: t.ledger.entity_type,
            reference: t.reference,
            is_unified: true
        })),
        ...legacyEntries.filter(entry => !syncedLegacyIds.has(entry.id)).map(entry => {
            const debitLines = entry.lines.filter(l => l.debit > 0);
            const creditLines = entry.lines.filter(l => l.credit > 0);
            return { 
                id: entry.id, // Use actual entry ID
                date: entry.date, 
                description: entry.description, 
                transaction_type: entry.type === 'RECEIPT' ? 'INCOME' : (entry.type === 'PAYMENT' || entry.type === 'EXPENSE' ? 'EXPENSE' : 'JOURNAL'), 
                category: 'Legacy', 
                amount: entry.amount, 
                ledger_name: debitLines.length === 1 ? debitLines[0].ledger.name : (creditLines.length === 1 ? creditLines[0].ledger.name : 'Multiple Accounts'),
                entity_type: debitLines.length === 1 ? debitLines[0].ledger.entity_type : (creditLines.length === 1 ? creditLines[0].ledger.entity_type : 'INTERNAL'),
                reference: entry.reference,
                is_unified: false
            };
        })
    ];
    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
};

export const getExpenseSummary = async (month?: number, year?: number) => {
    const dateQuery: any = {};
    if (month && year) {
        dateQuery.date = { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59) };
    }
    const expenses = await prisma.unifiedTransaction.groupBy({ by: ['category'], where: { transaction_type: 'EXPENSE', ...dateQuery }, _sum: { amount: true }, _count: { id: true } });
    return expenses.map(e => ({ category: e.category || 'Uncategorized', total: e._sum.amount || 0, count: e._count.id }));
};

// --- MISC LEGACY HELPERS ---

export const getLedgers = async () => prisma.ledger.findMany({ include: { head: true }, orderBy: { name: 'asc' } });
export const getAccountHeads = async () => prisma.accountHead.findMany({ orderBy: { code: 'asc' } });
export const deleteLedger = async (id: string) => {
    const count = await prisma.journalLine.count({ where: { ledger_id: id } });
    if (count > 0) throw new Error("Cannot delete ledger with transactions.");
    return prisma.ledger.delete({ where: { id } });
};

export const getIncomeSummary = async (month?: number, year?: number) => {
    const dateQuery: any = {};
    if (month && year) {
        dateQuery.date = { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59) };
    }
    const incomes = await prisma.unifiedTransaction.groupBy({ 
        by: ['category'], 
        where: { transaction_type: 'INCOME', ...dateQuery }, 
        _sum: { amount: true }, 
        _count: { id: true } 
    });
    return incomes.map(e => ({ 
        category: e.category || 'Uncategorized', 
        total: e._sum.amount || 0, 
        count: e._count.id 
    }));
};

export const getCategoryTransactions = async (category: string) => {
    return prisma.unifiedTransaction.findMany({
        where: { category },
        include: { ledger: true },
        orderBy: { date: 'desc' }
    });
};

// --- LEGACY ACCOUNTING CORE (RESTORED) ---

export const recordTransaction = async (data: {
    date: Date;
    description: string;
    amount: number;
    type: string;
    from_ledger_id: string; // Credit
    to_ledger_id: string;   // Debit
    reference?: string;
    nature?: string;
    user_id?: string;
    entity_id?: string;
}) => {
    return prisma.$transaction(async (tx) => {
        const entry = await createJournalEntry(tx, {
            date: data.date,
            description: data.description,
            amount: data.amount,
            type: data.type,
            debit_ledger_id: data.to_ledger_id,
            credit_ledger_id: data.from_ledger_id,
            reference: data.reference,
            nature: data.nature,
            created_by_id: data.user_id
        });

        if (data.nature === 'ADVANCE_RECEIVED' && data.entity_id) {
            await tx.client.update({
                where: { id: data.entity_id },
                data: { advance_balance: { increment: data.amount } }
            });
        } else if ((data.nature === 'ADVANCE_PAID' || data.nature === 'SALARY_ADVANCE') && data.entity_id) {
            await tx.user.update({
                where: { id: data.entity_id },
                data: { advance_balance: { increment: data.amount } }
            });
        }

        return entry;
    });
};

export const ensureLedger = async (entityType: string, entityId: string, headCode: string, description?: string) => {
    let entityName = '';
    if (entityType === 'CLIENT') {
        const c = await prisma.client.findUnique({ where: { id: entityId } });
        if (!c) throw new Error("Client not found for ledger creation");
        entityName = c.name;
    } else if (entityType === 'USER') {
        const u = await prisma.user.findUnique({ where: { id: entityId } });
        if (!u) throw new Error("User not found for ledger creation");
        entityName = u.full_name;
    } else {
        entityName = entityId;
    }

    const head = await prisma.accountHead.findUnique({ where: { code: headCode } });
    if (!head) throw new Error(`Account Head Code ${headCode} not found.`);

    const existing = await prisma.ledger.findFirst({
        where: {
            OR: [
                { entity_type: entityType, entity_id: entityId, head_id: head.id },
                { name: entityName, head_id: head.id }
            ]
        }
    });

    if (existing) {
        const updates: any = {};
        if (existing.head_id !== head.id) updates.head_id = head.id;
        if (existing.entity_id !== entityId) updates.entity_id = entityId;
        if (existing.name !== entityName) updates.name = entityName;

        if (Object.keys(updates).length > 0) {
            return await prisma.ledger.update({
                where: { id: existing.id },
                data: updates
            });
        }
        return existing;
    }

    return await createLedger({
        name: entityName,
        entity_type: entityType,
        entity_id: entityId,
        head_id: head.id,
        description: description || `Auto-generated Ledger for ${entityType}`
    });
};

export const getAccountStatement = async (ledgerIds: string | string[], startDate: Date, endDate: Date) => {
    let ids = Array.isArray(ledgerIds) ? ledgerIds : [ledgerIds];
    ids = ids.filter(id => id && id.trim() !== '');
    if (ids.length === 0) throw new Error("No valid ledger accounts selected for the statement.");

    const ledgers = await prisma.ledger.findMany({
        where: { id: { in: ids } },
        include: { head: true }
    });
    if (ledgers.length === 0) throw new Error("Ledger(s) not found");

    const primaryLedger = ledgers[0];
    const isPrimaryDebitNature = ['ASSET', 'EXPENSE'].includes(primaryLedger.head.type);
    let totalOpeningBalance = 0;

    for (const ledger of ledgers) {
        const openingAgg = await prisma.journalLine.aggregate({
            where: { ledger_id: ledger.id, entry: { date: { lt: startDate } } },
            _sum: { debit: true, credit: true }
        });

        const isDebitNature = ['ASSET', 'EXPENSE'].includes(ledger.head.type);
        const opDr = openingAgg._sum.debit || 0;
        const opCr = openingAgg._sum.credit || 0;
        const ledgerOpBal = isDebitNature ? (opDr - opCr) : (opCr - opDr);

        if (isDebitNature === isPrimaryDebitNature) {
            totalOpeningBalance += ledgerOpBal;
        } else {
            totalOpeningBalance -= ledgerOpBal;
        }
    }

    const transactions = await prisma.journalLine.findMany({
        where: { ledger_id: { in: ids }, entry: { date: { gte: startDate, lte: endDate } } },
        include: { entry: true, ledger: { include: { head: true } } },
        orderBy: { entry: { date: 'asc' } }
    });

    let runningBalance = totalOpeningBalance;
    const statementLines = transactions.map(tx => {
        const isTxDebitNature = ['ASSET', 'EXPENSE'].includes(tx.ledger.head.type);
        const impactOnItself = isTxDebitNature ? (tx.debit - tx.credit) : (tx.credit - tx.debit);
        const impactOnConsolidated = (isTxDebitNature === isPrimaryDebitNature) ? impactOnItself : -impactOnItself;
        runningBalance += impactOnConsolidated;
        return {
            id: tx.id,
            date: tx.entry.date,
            description: tx.entry.description,
            type: tx.entry.type,
            reference: tx.entry.reference,
            debit: tx.debit,
            credit: tx.credit,
            balance: runningBalance,
            ledger_name: tx.ledger.name
        };
    });

    return {
        ledger: primaryLedger,
        all_ledgers: ledgers.map(l => l.name),
        period: { start: startDate, end: endDate },
        opening_balance: totalOpeningBalance,
        closing_balance: runningBalance,
        transactions: statementLines
    };
};

export const getFinancialOverview = async (month?: number, year?: number) => {
    const now = new Date();
    const targetMonth = month !== undefined ? month - 1 : now.getMonth();
    const targetYear = year !== undefined ? year : now.getFullYear();
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    const prevMonthEndDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    const monthName = startDate.toLocaleString('default', { month: 'long' });

    const journalLines = await prisma.journalLine.findMany({
        where: { entry: { date: { gte: startDate, lte: endDate } } },
        include: { ledger: { include: { head: true } } }
    });

    let income = 0;
    let expense = 0;
    const expenseBreakdown: Record<string, number> = {};

    journalLines.forEach(line => {
        const { head } = line.ledger;
        const impact = line.debit - line.credit;
        if (head.type === 'INCOME') {
            income -= impact;
        } else if (head.type === 'EXPENSE') {
            expense += impact;
            if (impact > 0) {
                expenseBreakdown[line.ledger.name] = (expenseBreakdown[line.ledger.name] || 0) + impact;
            }
        }
    });

    const bankLeads = await prisma.ledger.findMany({
        where: { OR: [{ entity_type: 'BANK' }, { entity_type: 'CASH' }] }
    });

    let openingBalance = 0;
    let closingBalance = 0;
    for (const l of bankLeads) {
        const opAgg = await prisma.journalLine.aggregate({
            where: { ledger_id: l.id, entry: { date: { lte: prevMonthEndDate } } },
            _sum: { debit: true, credit: true }
        });
        openingBalance += (opAgg._sum.debit || 0) - (opAgg._sum.credit || 0);

        const clAgg = await prisma.journalLine.aggregate({
            where: { ledger_id: l.id, entry: { date: { lte: endDate } } },
            _sum: { debit: true, credit: true }
        });
        closingBalance += (clAgg._sum.debit || 0) - (clAgg._sum.credit || 0);
    }

    return {
        month_name: monthName,
        income,
        expense,
        net_profit: income - expense,
        opening_balance: openingBalance,
        cash_bank_balance: closingBalance,
        expense_pie_data: Object.entries(expenseBreakdown).map(([name, value]) => ({ name, value }))
    };
};

export const syncEntityLedgers = async () => {
    console.log("[SYNC_LEDGERS] Scanning all legacy ledgers for missing mappings...");
    const allLedgers = await prisma.ledger.findMany();
    const allMappings = await prisma.legacyLedgerMapping.findMany();
    
    let count = 0;
    for (const l of allLedgers) {
        try {
            const isMapped = allMappings.some(m => m.old_income_ledger_id === l.id || m.old_expense_ledger_id === l.id);
            if (!isMapped) {
                console.log(`[SYNC_LEDGERS] Creating unified mapping for: ${l.name} (${l.entity_type})`);
                await createUnifiedLedger({
                    entity_type: l.entity_type || 'GENERAL', // Fallback for null entity_type
                    entity_id: l.entity_id || l.name, // Use name as ID for internal/bank ledgers
                    ledger_name: l.name,
                    old_income_ledger_id: l.id
                });
                count++;
            }
        } catch (e) {
            console.error(`[SYNC_LEDGERS] Failed to sync ledger ${l.name}:`, e);
        }
    }

    console.log(`[SYNC_LEDGERS] Sync complete. Created ${count} new mappings.`);
    return { message: "Sync Complete", new_ledgers: count };
};

export const getTransactions = async (limit: number = 20, offset: number = 0, startDate?: Date, endDate?: Date, clientId?: string, accountType?: string) => {
    const whereClause: any = {};
    if (startDate && endDate) {
        whereClause.date = { gte: startDate, lte: endDate };
    }
    if (accountType) {
        if (['BANK', 'CASH'].includes(accountType)) {
            whereClause.lines = { some: { ledger: { entity_type: accountType } } };
        } else {
            whereClause.lines = { some: { ledger: { head: { type: accountType } } } };
        }
    }
    if (clientId) {
        const client = await prisma.client.findUnique({ where: { id: clientId } });
        const orConditions: any[] = [
            { lines: { some: { ledger: { entity_type: 'CLIENT', entity_id: clientId } } } },
            { invoice: { client_id: clientId } }
        ];
        if (client) {
            orConditions.push({ lines: { some: { ledger: { name: client.name } } } });
        }
        whereClause.OR = orConditions;
    }

    const transactions = await prisma.journalEntry.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        take: limit > 0 ? limit : undefined,
        skip: offset,
        include: { lines: { include: { ledger: true } } }
    });

    return transactions.map((tx: any) => {
        const debitLines = tx.lines.filter((l: any) => l.debit > 0);
        const creditLines = tx.lines.filter((l: any) => l.credit > 0);
        return {
            id: tx.id,
            transaction_number: tx.transaction_number,
            date: tx.date,
            description: tx.description,
            type: tx.type,
            amount: tx.amount,
            reference: tx.reference,
            nature: tx.nature,
            created_by: 'System',
            debit_ledgers: debitLines.map((l: any) => `${l.ledger.name} (${l.ledger.ledger_code || '-'})`).join(', '),
            credit_ledgers: creditLines.map((l: any) => `${l.ledger.name} (${l.ledger.ledger_code || '-'})`).join(', ')
        };
    });
};

export const updateLedger = async (id: string, data: any) => {
    return prisma.ledger.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description,
            status: data.status
        }
    });
};

export const deleteTransaction = async (entryId: string) => {
    const entry = await prisma.journalEntry.findUnique({
        where: { id: entryId },
        include: { lines: true }
    });
    if (!entry) throw new Error("Transaction not found");

    for (const line of entry.lines) {
        if (line.debit > 0) {
            await prisma.ledger.update({ where: { id: line.ledger_id }, data: { balance: { decrement: line.debit } } });
        }
        if (line.credit > 0) {
            await prisma.ledger.update({ where: { id: line.ledger_id }, data: { balance: { increment: line.credit } } });
        }
    }

    if (entry.nature === 'ADVANCE_RECEIVED') {
        const creditLine = entry.lines.find(l => l.credit > 0);
        if (creditLine) {
            const ledger = await prisma.ledger.findUnique({ where: { id: creditLine.ledger_id } });
            if (ledger && ledger.entity_type === 'CLIENT' && ledger.entity_id) {
                await prisma.client.update({ where: { id: ledger.entity_id }, data: { advance_balance: { decrement: entry.amount } } });
            }
        }
    } else if (entry.nature === 'ADVANCE_PAID' || entry.nature === 'SALARY_ADVANCE') {
        const debitLine = entry.lines.find(l => l.debit > 0);
        if (debitLine) {
            const ledger = await prisma.ledger.findUnique({ where: { id: debitLine.ledger_id } });
            if (ledger && ledger.entity_type === 'USER' && ledger.entity_id) {
                await prisma.user.update({ where: { id: ledger.entity_id }, data: { advance_balance: { decrement: entry.amount } } });
            }
        }
    }

    // Requirement: Delete associated UnifiedTransaction if any
    const linkedUnifiedTx = await prisma.unifiedTransaction.findFirst({
        where: {
            OR: [
                { reference: entry.reference || 'NONE_STRICT' },
                { reference: `LE:${entryId}` },
                { reference: `PAYROLL_SLIP:${entry.id}` }, // Legacy link
                { description: entry.description, amount: entry.amount, date: entry.date }
            ]
        }
    });
    
    if (linkedUnifiedTx) {
        // Use the unified delete logic to ensure all side effects (payroll, etc) are reverted
        await deleteUnifiedTransaction(linkedUnifiedTx.id);
    }

    // Handle Payroll Slip Status Reversion for direct legacy entries
    const legacySlipId = entry.reference?.startsWith('PAYROLL_SLIP:') ? entry.reference.split(':')[1] : null;
    if (legacySlipId) {
        await prisma.payrollSlip.update({
            where: { id: legacySlipId },
            data: { status: 'PENDING', payment_date: null }
        });
    }

    await prisma.journalLine.deleteMany({ where: { entry_id: entryId } });
    await prisma.journalEntry.delete({ where: { id: entryId } });
    return { message: "Transaction deleted and balances reverted." };
};

export const updateTransaction = async (entryId: string, data: any) => {
    return prisma.$transaction(async (tx) => {
        const originalEntry = await tx.journalEntry.findUnique({
            where: { id: entryId },
            include: { lines: true }
        });
        if (!originalEntry) throw new Error("Transaction not found");

        const updates: any = {};
        if (data.description) updates.description = data.description;
        if (data.date) updates.date = new Date(data.date);
        if (data.reference) updates.reference = data.reference;

        if (data.amount === undefined || data.amount === originalEntry.amount) {
            return tx.journalEntry.update({ where: { id: entryId }, data: updates });
        }

        const newAmount = data.amount;
        const oldAmount = originalEntry.amount;
        const ratio = newAmount / oldAmount;
        updates.amount = newAmount;

        for (const line of originalEntry.lines) {
            if (line.debit > 0) {
                await tx.ledger.update({ where: { id: line.ledger_id }, data: { balance: { decrement: line.debit } } });
            }
            if (line.credit > 0) {
                await tx.ledger.update({ where: { id: line.ledger_id }, data: { balance: { increment: line.credit } } });
            }
        }

        for (const line of originalEntry.lines) {
            const newDebit = line.debit * ratio;
            const newCredit = line.credit * ratio;
            await tx.journalLine.update({ where: { id: line.id }, data: { debit: newDebit, credit: newCredit } });
            if (newDebit > 0) {
                await tx.ledger.update({ where: { id: line.ledger_id }, data: { balance: { increment: newDebit } } });
            }
            if (newCredit > 0) {
                await tx.ledger.update({ where: { id: line.ledger_id }, data: { balance: { decrement: newCredit } } });
            }
        }

        return tx.journalEntry.update({ where: { id: entryId }, data: updates });
    });
};
