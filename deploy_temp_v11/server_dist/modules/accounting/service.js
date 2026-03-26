"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransaction = exports.deleteTransaction = exports.getTransactions = exports.syncEntityLedgers = exports.getFinancialOverview = exports.getAccountStatement = exports.deleteLedger = exports.updateLedger = exports.getAccountHeads = exports.getLedgers = exports.ensureLedger = exports.recordTransaction = exports.createJournalEntry = exports.createLedger = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const transactionIdGenerator_1 = require("../../utils/transactionIdGenerator");
const ledgerIdGenerator_1 = require("../../utils/ledgerIdGenerator");
const createLedger = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const ledgerCode = yield (0, ledgerIdGenerator_1.generateLedgerCode)(tx);
        // 1. Create Ledger
        const ledger = yield tx.ledger.create({
            data: {
                ledger_code: ledgerCode,
                name: data.name,
                head_id: data.head_id,
                entity_type: data.entity_type,
                entity_id: data.entity_id, // Pass it through
                description: data.description,
                status: 'ACTIVE',
                balance: 0 // Balance is updated via transactions only
            }
        });
        // 2. Handle Opening Balance if > 0
        if (data.opening_balance && data.opening_balance > 0) {
            // Find "Opening Balance Adjustment" ledger
            const adjustmentLedger = yield tx.ledger.findFirst({
                where: { name: 'Opening Balance Adjustment' }
            });
            if (!adjustmentLedger)
                throw new Error("System Ledger 'Opening Balance Adjustment' not found.");
            // Determine Debit/Credit based on Head Type
            // Assets/Expenses -> Debit increases
            // Liabilities/Income/Equity -> Credit increases
            const head = yield tx.accountHead.findUnique({ where: { id: data.head_id } });
            if (!head)
                throw new Error("Account Head not found");
            const isDebitNature = ['ASSET', 'EXPENSE'].includes(head.type);
            // If Asset/Expense: Debit Ledger, Credit Adjustment
            // If Liability/Income: Credit Ledger, Debit Adjustment
            let debitLedgerId = isDebitNature ? ledger.id : adjustmentLedger.id;
            let creditLedgerId = isDebitNature ? adjustmentLedger.id : ledger.id;
            yield (0, exports.createJournalEntry)(tx, {
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
    }));
});
exports.createLedger = createLedger;
// Exported for internal module usage (Payroll, Invoicing)
const createJournalEntry = (tx, data) => __awaiter(void 0, void 0, void 0, function* () {
    const transactionId = yield (0, transactionIdGenerator_1.generateTransactionId)(tx);
    // 1. Create Header
    const entry = yield tx.journalEntry.create({
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
        yield tx.journalLine.create({
            data: {
                entry_id: entry.id,
                ledger_id: line.ledger_id,
                debit: line.debit,
                credit: line.credit
            }
        });
        // Update Ledger Balance
        if (line.debit > 0) {
            yield tx.ledger.update({
                where: { id: line.ledger_id },
                data: { balance: { increment: line.debit } }
            });
        }
        if (line.credit > 0) {
            yield tx.ledger.update({
                where: { id: line.ledger_id },
                data: { balance: { decrement: line.credit } }
            });
        }
    }
    return entry;
});
exports.createJournalEntry = createJournalEntry;
const recordTransaction = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const transactionId = yield (0, transactionIdGenerator_1.generateTransactionId)(tx);
        // Create Entry
        const entry = yield tx.journalEntry.create({
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
        yield tx.journalLine.create({
            data: {
                entry_id: entry.id,
                ledger_id: data.to_ledger_id,
                debit: data.amount,
                credit: 0
            }
        });
        // Credit Line (Giver - From)
        yield tx.journalLine.create({
            data: {
                entry_id: entry.id,
                ledger_id: data.from_ledger_id,
                debit: 0,
                credit: data.amount
            }
        });
        // Update Balances (Dr+, Cr-)
        yield tx.ledger.update({
            where: { id: data.to_ledger_id },
            data: { balance: { increment: data.amount } }
        });
        yield tx.ledger.update({
            where: { id: data.from_ledger_id },
            data: { balance: { decrement: data.amount } }
        });
        // --- ADVANCE LOGIC ---
        if (data.nature === 'ADVANCE_RECEIVED' && data.entity_id) {
            // Client Advance: Increase Client's Advance Balance
            yield tx.client.update({
                where: { id: data.entity_id },
                data: { advance_balance: { increment: data.amount } }
            });
        }
        else if (data.nature === 'ADVANCE_PAID' && data.entity_id) {
            // Staff Advance: Increase User's Advance Balance
            yield tx.user.update({
                where: { id: data.entity_id },
                data: { advance_balance: { increment: data.amount } }
            });
        }
        return entry;
    }));
});
exports.recordTransaction = recordTransaction;
// Ledger management functions
// Ledger management functions
const ensureLedger = (entityType, entityId, headCode, description) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Resolve Entity Name
    let entityName = '';
    if (entityType === 'CLIENT') {
        const c = yield prisma_1.default.client.findUnique({ where: { id: entityId } });
        if (!c)
            throw new Error("Client not found for ledger creation");
        entityName = c.name;
    }
    else if (entityType === 'USER') { // Support Staff
        const u = yield prisma_1.default.user.findUnique({ where: { id: entityId } });
        if (!u)
            throw new Error("User not found for ledger creation");
        entityName = u.full_name;
    }
    else {
        // For INTERNAL, BANK, etc., use entityId as the name identifier
        entityName = entityId;
    }
    // 2. Resolve Head ID from Code
    const head = yield prisma_1.default.accountHead.findUnique({ where: { code: headCode } });
    if (!head)
        throw new Error(`Account Head Code ${headCode} not found.`);
    // 3. Find Existing Ledger
    let existing;
    if (entityId) {
        existing = yield prisma_1.default.ledger.findFirst({
            where: {
                entity_type: entityType,
                entity_id: entityId
            }
        });
    }
    else {
        existing = yield prisma_1.default.ledger.findFirst({
            where: {
                entity_type: entityType,
                name: entityName
            }
        });
    }
    if (existing) {
        // UPDATE Logic: If head is different, entity_id is missing, OR NAME is different (Sync Name)
        const updates = {};
        if (existing.head_id !== head.id)
            updates.head_id = head.id;
        if (existing.entity_id !== entityId)
            updates.entity_id = entityId;
        if (existing.name !== entityName)
            updates.name = entityName;
        if (Object.keys(updates).length > 0) {
            console.log(`[Ledger] Automatic update of ${Object.keys(updates).join(', ')} for ${entityType} ${entityId}`);
            return yield prisma_1.default.ledger.update({
                where: { id: existing.id },
                data: updates
            });
        }
        return existing;
    }
    // 4. Create New
    // 4. Create New
    return yield (0, exports.createLedger)({
        name: entityName,
        entity_type: entityType,
        entity_id: entityId, // FIX: Pass the entity ID!
        head_id: head.id,
        description: description || `Auto-generated Ledger for ${entityType}`
    });
});
exports.ensureLedger = ensureLedger;
const getLedgers = () => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.ledger.findMany({
        include: { head: true },
        orderBy: { name: 'asc' }
    });
});
exports.getLedgers = getLedgers;
const getAccountHeads = () => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.accountHead.findMany({
        orderBy: { code: 'asc' }
    });
});
exports.getAccountHeads = getAccountHeads;
const updateLedger = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    // Basic update logic
    return prisma_1.default.ledger.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description,
            status: data.status
        }
    });
});
exports.updateLedger = updateLedger;
const deleteLedger = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const ledger = yield prisma_1.default.ledger.findUnique({
        where: { id },
        include: { _count: { select: { journalLines: true } } }
    });
    if (!ledger)
        throw new Error("Ledger not found");
    if (ledger._count.journalLines > 0) {
        throw new Error("Cannot delete ledger with existing transactions.");
    }
    return prisma_1.default.ledger.delete({ where: { id } });
});
exports.deleteLedger = deleteLedger;
// Restore getAccountStatement
const getAccountStatement = (ledgerId, startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    const ledger = yield prisma_1.default.ledger.findUnique({
        where: { id: ledgerId },
        include: { head: true }
    });
    if (!ledger)
        throw new Error("Ledger not found");
    const openingAgg = yield prisma_1.default.journalLine.aggregate({
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
    const transactions = yield prisma_1.default.journalLine.findMany({
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
});
exports.getAccountStatement = getAccountStatement;
const getFinancialOverview = () => __awaiter(void 0, void 0, void 0, function* () {
    const ledgers = yield prisma_1.default.ledger.findMany({ include: { head: true } });
    let income = 0;
    let expense = 0;
    let bank = 0;
    const expenseBreakdown = {};
    ledgers.forEach(l => {
        if (l.head.type === 'INCOME')
            income += Math.abs(l.balance);
        else if (l.head.type === 'EXPENSE') {
            expense += l.balance;
            if (l.balance > 0)
                expenseBreakdown[l.name] = (expenseBreakdown[l.name] || 0) + l.balance;
        }
        else if (l.entity_type && ['BANK', 'CASH'].includes(l.entity_type)) {
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
});
exports.getFinancialOverview = getFinancialOverview;
const syncEntityLedgers = () => __awaiter(void 0, void 0, void 0, function* () {
    let count = 0;
    const clients = yield prisma_1.default.client.findMany();
    for (const c of clients) {
        if (!c.id)
            continue;
        const l = yield (0, exports.ensureLedger)('CLIENT', c.id, '1000');
        if (l.createdAt > new Date(Date.now() - 5000))
            count++;
    }
    const staff = yield prisma_1.default.user.findMany();
    for (const u of staff) {
        if (!u.id)
            continue;
        const l = yield (0, exports.ensureLedger)('USER', u.id, '6000');
        if (l.createdAt > new Date(Date.now() - 5000))
            count++;
    }
    return { message: "Sync Complete", new_ledgers: count };
});
exports.syncEntityLedgers = syncEntityLedgers;
const getTransactions = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 20, startDate, endDate, clientId) {
    const whereClause = {};
    if (startDate && endDate) {
        whereClause.date = {
            gte: startDate,
            lte: endDate
        };
    }
    if (clientId) {
        // Fetch Client Details to get Name
        const client = yield prisma_1.default.client.findUnique({ where: { id: clientId } });
        const orConditions = [
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
    const transactions = yield prisma_1.default.journalEntry.findMany({
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
    return transactions.map((tx) => {
        const debitLines = tx.lines.filter((l) => l.debit > 0);
        const creditLines = tx.lines.filter((l) => l.credit > 0);
        return {
            id: tx.id,
            transaction_number: tx.transaction_number,
            date: tx.date,
            description: tx.description,
            type: tx.type,
            amount: tx.amount,
            reference: tx.reference,
            created_by: 'System', // Schema relation missing
            debit_ledgers: debitLines.map((l) => `${l.ledger.name} (${l.ledger.ledger_code || '-'})`).join(', '),
            credit_ledgers: creditLines.map((l) => `${l.ledger.name} (${l.ledger.ledger_code || '-'})`).join(', ')
        };
    });
});
exports.getTransactions = getTransactions;
const deleteTransaction = (entryId) => __awaiter(void 0, void 0, void 0, function* () {
    const entry = yield prisma_1.default.journalEntry.findUnique({
        where: { id: entryId },
        include: { lines: true }
    });
    if (!entry)
        throw new Error("Transaction not found");
    for (const line of entry.lines) {
        if (line.debit > 0) {
            yield prisma_1.default.ledger.update({
                where: { id: line.ledger_id },
                data: { balance: { decrement: line.debit } }
            });
        }
        if (line.credit > 0) {
            yield prisma_1.default.ledger.update({
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
            const ledger = yield prisma_1.default.ledger.findUnique({ where: { id: creditLine.ledger_id } });
            if (ledger && ledger.entity_type === 'CLIENT' && ledger.entity_id) {
                yield prisma_1.default.client.update({
                    where: { id: ledger.entity_id },
                    data: { advance_balance: { decrement: entry.amount } }
                });
            }
        }
    }
    else if (entry.nature === 'ADVANCE_PAID') {
        // Advance Paid -> Debit Ledger is User (Staff)
        const debitLine = entry.lines.find(l => l.debit > 0);
        if (debitLine) {
            const ledger = yield prisma_1.default.ledger.findUnique({ where: { id: debitLine.ledger_id } });
            if (ledger && ledger.entity_type === 'USER' && ledger.entity_id) {
                yield prisma_1.default.user.update({
                    where: { id: ledger.entity_id },
                    data: { advance_balance: { decrement: entry.amount } }
                });
            }
        }
    }
    yield prisma_1.default.journalLine.deleteMany({ where: { entry_id: entryId } });
    yield prisma_1.default.journalEntry.delete({ where: { id: entryId } });
    return { message: "Transaction deleted and balances reverted." };
});
exports.deleteTransaction = deleteTransaction;
const updateTransaction = (entryId, data) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Fetch original entry
        const originalEntry = yield tx.journalEntry.findUnique({
            where: { id: entryId },
            include: { lines: true }
        });
        if (!originalEntry)
            throw new Error("Transaction not found");
        const updates = {};
        if (data.description)
            updates.description = data.description;
        if (data.date)
            updates.date = data.date;
        if (data.reference)
            updates.reference = data.reference;
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
                yield tx.ledger.update({
                    where: { id: line.ledger_id },
                    data: { balance: { decrement: line.debit } }
                });
            }
            if (line.credit > 0) {
                yield tx.ledger.update({
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
            yield tx.journalLine.update({
                where: { id: line.id },
                data: { debit: newDebit, credit: newCredit }
            });
            // Apply New Balance
            if (newDebit > 0) {
                yield tx.ledger.update({
                    where: { id: line.ledger_id },
                    data: { balance: { increment: newDebit } }
                });
            }
            if (newCredit > 0) {
                yield tx.ledger.update({
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
    }));
});
exports.updateTransaction = updateTransaction;
