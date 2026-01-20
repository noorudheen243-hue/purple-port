import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { generateTransactionId } from '../../utils/transactionIdGenerator';

export type LedgerType = 'CLIENT' | 'VENDOR' | 'BANK' | 'CASH' | 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' | 'INTERNAL';

export const createLedger = async (data: {
    name: string;
    head_id: string;
    entity_type: string;
    entity_id?: string; // Added optional entity_id
    description?: string;
    opening_balance?: number;
    opening_balance_date?: Date;
}) => {
    return prisma.$transaction(async (tx) => {
        // 1. Create Ledger
        const ledger = await tx.ledger.create({
            data: {
                name: data.name,
                head_id: data.head_id,
                entity_type: data.entity_type,
                entity_id: data.entity_id,     // Pass it through
                description: data.description,
                status: 'ACTIVE',
                balance: 0 // Balance is updated via transactions only
            }
        });

        // 2. Handle Opening Balance if > 0
        if (data.opening_balance && data.opening_balance > 0) {
            // Find "Opening Balance Adjustment" ledger
            const adjustmentLedger = await tx.ledger.findFirst({
                where: { name: 'Opening Balance Adjustment' }
            });

            if (!adjustmentLedger) throw new Error("System Ledger 'Opening Balance Adjustment' not found.");

            // Determine Debit/Credit based on Head Type
            // Assets/Expenses -> Debit increases
            // Liabilities/Income/Equity -> Credit increases

            const head = await tx.accountHead.findUnique({ where: { id: data.head_id } });
            if (!head) throw new Error("Account Head not found");

            const isDebitNature = ['ASSET', 'EXPENSE'].includes(head.type);

            // If Asset/Expense: Debit Ledger, Credit Adjustment
            // If Liability/Income: Credit Ledger, Debit Adjustment

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

// Exported for internal module usage (Payroll, Invoicing)
export const createJournalEntry = async (
    tx: Prisma.TransactionClient,
    data: {
        date: Date;
        description: string;
        amount: number;
        type: string;
        // Standard Two-Leg Support (Optional if using lines directly)
        debit_ledger_id?: string;
        credit_ledger_id?: string;
        reference?: string;
        invoice_id?: string;
        created_by_id?: string;
        // Multi-Leg Support
        lines?: { ledger_id: string; debit: number; credit: number }[];
    }
) => {
    const transactionId = await generateTransactionId(tx);

    // 1. Create Header
    const entry = await tx.journalEntry.create({
        data: {
            date: data.date,
            description: data.description,
            amount: data.amount,
            type: data.type,
            reference: data.reference,
            // @ts-ignore
            transaction_number: transactionId,
            created_by_id: data.created_by_id || 'SYSTEM',
            invoice: data.invoice_id ? { connect: { id: data.invoice_id } } : undefined
        }
    });

    // 2. Prepare Lines
    const linesToCreate = [];

    // Support basic 2-leg inputs
    if (data.debit_ledger_id && data.credit_ledger_id) {
        linesToCreate.push({ ledger_id: data.debit_ledger_id, debit: data.amount, credit: 0 });
        linesToCreate.push({ ledger_id: data.credit_ledger_id, debit: 0, credit: data.amount });
    }

    // Support explicit multi-leg inputs
    if (data.lines && data.lines.length > 0) {
        linesToCreate.push(...data.lines);
    }

    if (linesToCreate.length === 0) {
        throw new Error("Journal Entry must have at least 2 lines (Debit/Credit).");
    }

    // 3. Create Lines & Update Balances
    for (const line of linesToCreate) {
        await tx.journalLine.create({
            data: {
                entry_id: entry.id,
                ledger_id: line.ledger_id,
                debit: line.debit,
                credit: line.credit
            }
        });

        // Update Ledger Balance
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

    return entry;
};


export const recordTransaction = async (data: {
    date: Date;
    description: string;
    amount: number;
    type: string; // PAYMENT, RECEIPT, CONTRA, EXPENSE
    from_ledger_id: string; // The GIVER (Credit)
    to_ledger_id: string;   // The RECEIVER (Debit)
    reference?: string;
    user_id: string;
    nature?: string; // GENERAL, ADVANCE_RECEIVED, ADVANCE_PAID
    entity_id?: string; // Client ID or User ID (Staff)
}) => {
    return prisma.$transaction(async (tx) => {
        const transactionId = await generateTransactionId(tx);

        // Create Entry
        const entry = await tx.journalEntry.create({
            data: {
                date: data.date,
                description: data.description,
                amount: data.amount,
                type: data.type,
                reference: data.reference,
                // @ts-ignore
                transaction_number: transactionId,
                created_by_id: data.user_id,
                nature: data.nature || 'GENERAL'
            }
        });

        // Debit Line (Receiver - To)
        await tx.journalLine.create({
            data: {
                entry_id: entry.id,
                ledger_id: data.to_ledger_id,
                debit: data.amount,
                credit: 0
            }
        });

        // Credit Line (Giver - From)
        await tx.journalLine.create({
            data: {
                entry_id: entry.id,
                ledger_id: data.from_ledger_id,
                debit: 0,
                credit: data.amount
            }
        });

        // Update Balances (Dr+, Cr-)
        await tx.ledger.update({
            where: { id: data.to_ledger_id },
            data: { balance: { increment: data.amount } }
        });

        await tx.ledger.update({
            where: { id: data.from_ledger_id },
            data: { balance: { decrement: data.amount } }
        });

        // --- ADVANCE LOGIC ---
        if (data.nature === 'ADVANCE_RECEIVED' && data.entity_id) {
            // Client Advance: Increase Client's Advance Balance
            await tx.client.update({
                where: { id: data.entity_id },
                data: { advance_balance: { increment: data.amount } }
            });
        } else if (data.nature === 'ADVANCE_PAID' && data.entity_id) {
            // Staff Advance: Increase User's Advance Balance
            await tx.user.update({
                where: { id: data.entity_id },
                data: { advance_balance: { increment: data.amount } }
            });
        }

        return entry;
    });
};

// Ledger management functions
// Ledger management functions
export const ensureLedger = async (entityType: string, entityId: string, headCode: string, description?: string) => {
    // 1. Resolve Entity Name
    let entityName = '';
    if (entityType === 'CLIENT') {
        const c = await prisma.client.findUnique({ where: { id: entityId } });
        if (!c) throw new Error("Client not found for ledger creation");
        entityName = c.name;
    } else if (entityType === 'USER') { // Support Staff
        const u = await prisma.user.findUnique({ where: { id: entityId } });
        if (!u) throw new Error("User not found for ledger creation");
        entityName = u.full_name;
    } else {
        // For INTERNAL, BANK, etc., use entityId as the name identifier
        entityName = entityId;
    }

    // 2. Resolve Head ID from Code
    const head = await prisma.accountHead.findUnique({ where: { code: headCode } });
    if (!head) throw new Error(`Account Head Code ${headCode} not found.`);

    // 3. Find Existing Ledger
    const existing = await prisma.ledger.findFirst({
        where: {
            entity_type: entityType,
            name: entityName
        }
    });

    if (existing) {
        // UPDATE Logic: If head is different or entity_id is missing, update it.
        const updates: any = {};
        if (existing.head_id !== head.id) updates.head_id = head.id;
        if (existing.entity_id !== entityId) updates.entity_id = entityId;

        if (Object.keys(updates).length > 0) {
            console.log(`[Ledger] Automatic update of ${Object.keys(updates).join(', ')} for ${entityType} ${entityId}`);
            return await prisma.ledger.update({
                where: { id: existing.id },
                data: updates
            });
        }
        return existing;
    }

    // 4. Create New
    // 4. Create New
    return await createLedger({
        name: entityName,
        entity_type: entityType,
        entity_id: entityId, // FIX: Pass the entity ID!
        head_id: head.id,
        description: description || `Auto-generated Ledger for ${entityType}`
    });
};

export const getLedgers = async () => {
    return prisma.ledger.findMany({
        include: { head: true },
        orderBy: { name: 'asc' }
    });
};

export const getAccountHeads = async () => {
    return prisma.accountHead.findMany({
        orderBy: { code: 'asc' }
    });
};

export const updateLedger = async (id: string, data: { name?: string; description?: string; status?: string; opening_balance?: number }) => {
    // Basic update logic
    return prisma.ledger.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description,
            status: data.status
        }
    });
};

export const deleteLedger = async (id: string) => {
    const ledger = await prisma.ledger.findUnique({
        where: { id },
        include: { _count: { select: { journalLines: true } } }
    });

    if (!ledger) throw new Error("Ledger not found");

    if (ledger._count.journalLines > 0) {
        throw new Error("Cannot delete ledger with existing transactions.");
    }

    return prisma.ledger.delete({ where: { id } });
};

// Restore getAccountStatement
export const getAccountStatement = async (ledgerId: string, startDate: Date, endDate: Date) => {
    const ledger = await prisma.ledger.findUnique({
        where: { id: ledgerId },
        include: { head: true }
    });
    if (!ledger) throw new Error("Ledger not found");

    const openingAgg = await prisma.journalLine.aggregate({
        where: {
            ledger_id: ledgerId,
            entry: { date: { lt: startDate } }
        },
        _sum: { debit: true, credit: true }
    });

    const isDebitNature = ['ASSET', 'EXPENSE'].includes(ledger.head.type);
    const opDr = openingAgg._sum.debit || 0;
    const opCr = openingAgg._sum.credit || 0;
    const openingBalance = isDebitNature ? (opDr - opCr) : (opCr - opDr);

    const transactions = await prisma.journalLine.findMany({
        where: {
            ledger_id: ledgerId,
            entry: { date: { gte: startDate, lte: endDate } }
        },
        include: { entry: true },
        orderBy: { entry: { date: 'asc' } }
    });

    let runningBalance = openingBalance;
    const statementLines = transactions.map(tx => {
        const impact = isDebitNature ? (tx.debit - tx.credit) : (tx.credit - tx.debit);
        runningBalance += impact;
        return {
            id: tx.id,
            date: tx.entry.date,
            description: tx.entry.description,
            type: tx.entry.type,
            reference: tx.entry.reference,
            debit: tx.debit,
            credit: tx.credit,
            balance: runningBalance
        };
    });

    return {
        ledger,
        period: { start: startDate, end: endDate },
        opening_balance: openingBalance,
        closing_balance: runningBalance,
        transactions: statementLines
    };
};

export const getFinancialOverview = async () => {
    const ledgers = await prisma.ledger.findMany({ include: { head: true } });

    let income = 0;
    let expense = 0;
    let bank = 0;
    const expenseBreakdown: any = {};

    ledgers.forEach(l => {
        if (l.head.type === 'INCOME') income += Math.abs(l.balance);
        else if (l.head.type === 'EXPENSE') {
            expense += l.balance;
            if (l.balance > 0) expenseBreakdown[l.name] = (expenseBreakdown[l.name] || 0) + l.balance;
        } else if (l.entity_type && ['BANK', 'CASH'].includes(l.entity_type)) {
            bank += l.balance;
        }
    });

    return {
        income,
        expense,
        net_profit: income - expense,
        cash_bank_balance: bank,
        expense_pie_data: Object.entries(expenseBreakdown).map(([name, value]) => ({ name, value }))
    };
};

export const syncEntityLedgers = async () => {
    let count = 0;
    const clients = await prisma.client.findMany();
    for (const c of clients) {
        if (!c.id) continue;
        const l = await ensureLedger('CLIENT', c.id, '1000');
        if (l.createdAt > new Date(Date.now() - 5000)) count++;
    }
    const staff = await prisma.user.findMany();
    for (const u of staff) {
        if (!u.id) continue;
        const l = await ensureLedger('USER', u.id, '6000');
        if (l.createdAt > new Date(Date.now() - 5000)) count++;
    }
    return { message: "Sync Complete", new_ledgers: count };
};


export const getTransactions = async (
    limit: number = 20,
    startDate?: Date,
    endDate?: Date,
    clientId?: string
) => {
    const whereClause: any = {};
    if (startDate && endDate) {
        whereClause.date = {
            gte: startDate,
            lte: endDate
        };
    }

    if (clientId) {
        // Fetch Client Details to get Name
        const client = await prisma.client.findUnique({ where: { id: clientId } });

        const orConditions: any[] = [
            // Case A: Linked via Ledger Lines (Direct Ledger Impact - Strict ID match)
            {
                lines: {
                    some: {
                        ledger: {
                            entity_type: 'CLIENT',
                            entity_id: clientId
                        }
                    }
                }
            },
            // Case B: Linked via Invoice
            {
                invoice: {
                    client_id: clientId
                }
            }
        ];

        // Case C: Fallback - Match Ledger by Client Name (If Entity ID/Type missing on Ledger)
        if (client) {
            orConditions.push({
                lines: {
                    some: {
                        ledger: {
                            name: client.name
                        }
                    }
                }
            });
        }

        whereClause.OR = orConditions;
    }



    const transactions = await prisma.journalEntry.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        take: limit,
        include: {
            lines: {
                include: { ledger: true }
            }
        }
    });

    // Transform for UI: Flatten Lines to show Debits/Credits clearly
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
            created_by: 'System', // Schema relation missing
            debit_ledgers: debitLines.map((l: any) => l.ledger.name).join(', '),
            credit_ledgers: creditLines.map((l: any) => l.ledger.name).join(', ')
        };
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
            await prisma.ledger.update({
                where: { id: line.ledger_id },
                data: { balance: { decrement: line.debit } }
            });
        }
        if (line.credit > 0) {
            await prisma.ledger.update({
                where: { id: line.ledger_id },
                data: { balance: { increment: line.credit } }
            });
        }
    }

    // Verify and Revert Advance Balances
    if (entry.nature === 'ADVANCE_RECEIVED') {
        // Find client linked? Usually found via Ledger Entity or passing context. 
        // Current Schema doesn't link JournalEntry directly to Client/User for nature.
        // We must inspect proper Journal Lines or rely on a new field.
        // LIMITATION: 'nature' was added, but 'entity_id' wasn't added to JournalEntry.
        // We have to infer from Ledgers. 
        // Advance Received -> Credit Ledger is Client.
        const creditLine = entry.lines.find(l => l.credit > 0);
        if (creditLine) {
            const ledger = await prisma.ledger.findUnique({ where: { id: creditLine.ledger_id } });
            if (ledger && ledger.entity_type === 'CLIENT' && ledger.entity_id) {
                await prisma.client.update({
                    where: { id: ledger.entity_id },
                    data: { advance_balance: { decrement: entry.amount } }
                });
            }
        }
    } else if (entry.nature === 'ADVANCE_PAID') {
        // Advance Paid -> Debit Ledger is User (Staff)
        const debitLine = entry.lines.find(l => l.debit > 0);
        if (debitLine) {
            const ledger = await prisma.ledger.findUnique({ where: { id: debitLine.ledger_id } });
            if (ledger && ledger.entity_type === 'USER' && ledger.entity_id) {
                await prisma.user.update({
                    where: { id: ledger.entity_id },
                    data: { advance_balance: { decrement: entry.amount } }
                });
            }
        }
    }

    await prisma.journalLine.deleteMany({ where: { entry_id: entryId } });
    await prisma.journalEntry.delete({ where: { id: entryId } });

    return { message: "Transaction deleted and balances reverted." };
};

export const updateTransaction = async (entryId: string, data: { description?: string, date?: Date, reference?: string, amount?: number }) => {
    return prisma.$transaction(async (tx) => {
        // 1. Fetch original entry
        const originalEntry = await tx.journalEntry.findUnique({
            where: { id: entryId },
            include: { lines: true }
        });
        if (!originalEntry) throw new Error("Transaction not found");

        const updates: any = {};
        if (data.description) updates.description = data.description;
        if (data.date) updates.date = data.date;
        if (data.reference) updates.reference = data.reference;

        // If Amount is NOT changing, just update metadata
        if (data.amount === undefined || data.amount === originalEntry.amount) {
            return tx.journalEntry.update({
                where: { id: entryId },
                data: updates
            });
        }

        // --- FINANCIAL UPDATE LOGIC ---
        const newAmount = data.amount;
        const oldAmount = originalEntry.amount;
        const ratio = newAmount / oldAmount;

        updates.amount = newAmount;

        // 2. Revert Old Balances
        for (const line of originalEntry.lines) {
            if (line.debit > 0) {
                await tx.ledger.update({
                    where: { id: line.ledger_id },
                    data: { balance: { decrement: line.debit } }
                });
            }
            if (line.credit > 0) {
                await tx.ledger.update({
                    where: { id: line.ledger_id },
                    data: { balance: { increment: line.credit } }
                });
            }
        }

        // 3. Update Lines (Scale by ratio) & Apply New Balances
        for (const line of originalEntry.lines) {
            const newDebit = line.debit * ratio;
            const newCredit = line.credit * ratio;

            // Update Line
            await tx.journalLine.update({
                where: { id: line.id },
                data: { debit: newDebit, credit: newCredit }
            });

            // Apply New Balance
            if (newDebit > 0) {
                await tx.ledger.update({
                    where: { id: line.ledger_id },
                    data: { balance: { increment: newDebit } }
                });
            }
            if (newCredit > 0) {
                await tx.ledger.update({
                    where: { id: line.ledger_id },
                    data: { balance: { decrement: newCredit } }
                });
            }
        }

        // 4. Update Header
        return tx.journalEntry.update({
            where: { id: entryId },
            data: updates
        });
    });
};
