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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransaction = exports.deleteTransaction = exports.getTransactions = exports.syncEntityLedgers = exports.getFinancialOverview = exports.getAccountStatement = exports.deleteLedger = exports.updateLedger = exports.getAccountHeads = exports.getLedgers = exports.ensureLedger = exports.recordTransaction = exports.createLedger = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const createLedger = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Create Ledger
        const ledger = yield tx.ledger.create({
            data: {
                name: data.name,
                head_id: data.head_id,
                entity_type: data.entity_type,
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
            yield createJournalEntry(tx, {
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
// Internal function to post double entry
const createJournalEntry = (tx, data) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Create Header
    const entry = yield tx.journalEntry.create({
        data: {
            date: data.date,
            description: data.description,
            amount: data.amount,
            type: data.type,
            reference: data.reference,
            created_by_id: 'SYSTEM', // TODO: Pass user ID
            invoice: data.invoice_id ? { connect: { id: data.invoice_id } } : undefined
        }
    });
    // 2. Create Lines
    yield tx.journalLine.create({
        data: {
            entry_id: entry.id,
            ledger_id: data.debit_ledger_id,
            debit: data.amount,
            credit: 0
        }
    });
    yield tx.journalLine.create({
        data: {
            entry_id: entry.id,
            ledger_id: data.credit_ledger_id,
            debit: 0,
            credit: data.amount
        }
    });
    // 3. Update Ledger Balances
    // Debit increases Asset/Expense, decreases Liab/Income
    // We store "Balance" loosely for quick access? Or strictly calculated? 
    // Prompt says "All ledger impacts must flow through transaction engine". 
    // Usually ERPs store a running balance for performance.
    // We will just Add Debit - Credit to balance for simplicity, but sign depends on nature.
    // Actually, simpler: Store NET Debit-Credit. 
    // Asset: Positive = Debit. Liability: Positive = Credit.
    // Let's stick to: Increase Balance logic based on nature?
    // No, standard is: Balance = Sum(Debit) - Sum(Credit). 
    // If Asset, result > 0 is Dr. If Liability, result < 0 is Cr.
    // Let's allow negative balances.
    yield tx.ledger.update({
        where: { id: data.debit_ledger_id },
        data: { balance: { increment: data.amount } } // Treat all as Dr +
    });
    yield tx.ledger.update({
        where: { id: data.credit_ledger_id },
        data: { balance: { decrement: data.amount } } // Treat all as Cr -
    });
    // NOTE: This means Assets have +ve balance, Liabilities have -ve balance. 
    // Display logic must handle the sign.
    return entry;
});
const recordTransaction = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // Create Entry
        const entry = yield tx.journalEntry.create({
            data: {
                date: data.date,
                description: data.description,
                amount: data.amount,
                type: data.type,
                reference: data.reference,
                created_by_id: data.user_id
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
        return entry;
    }));
});
exports.recordTransaction = recordTransaction;
const ensureLedger = (entityType, entityId, headCode, name) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if ledger exists for entity
    // We don't have entity_id indexed yet or unique? "Prevent duplicate ledgers per entity".
    // We should check if one exists.
    const existing = yield prisma_1.default.ledger.findFirst({
        where: { entity_id: entityId, entity_type: entityType }
    });
    if (existing)
        return existing;
    const head = yield prisma_1.default.accountHead.findUnique({ where: { code: headCode } });
    if (!head)
        throw new Error("Head Code not found: " + headCode);
    // Get Name from Entity if not provided
    let ledgerName = name;
    if (!ledgerName) {
        if (entityType === 'CLIENT') {
            const client = yield prisma_1.default.client.findUnique({ where: { id: entityId } });
            ledgerName = (client === null || client === void 0 ? void 0 : client.name) || "Unknown Client";
        }
        else if (entityType === 'USER') { // Staff
            const user = yield prisma_1.default.user.findUnique({ where: { id: entityId } });
            ledgerName = (user === null || user === void 0 ? void 0 : user.full_name) || "Unknown Staff";
        }
    }
    // Ensure Name Uniqueness
    // Append (Client) or something if duplicate?
    // "Prevent duplicate ledgers" - we mean we shouldn't create 2 ledgers for same client.
    return (0, exports.createLedger)({
        name: ledgerName || "New Ledger",
        head_id: head.id,
        entity_type: entityType,
        description: `Auto-created for ${entityType}`,
        opening_balance: 0
    });
});
exports.ensureLedger = ensureLedger;
const getLedgers = () => __awaiter(void 0, void 0, void 0, function* () {
    // Return ledgers formatted for UI
    const ledgers = yield prisma_1.default.ledger.findMany({
        include: { head: true },
        orderBy: { name: 'asc' }
    });
    return ledgers;
});
exports.getLedgers = getLedgers;
const getAccountHeads = () => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.accountHead.findMany({
        orderBy: { code: 'asc' }
    });
});
exports.getAccountHeads = getAccountHeads;
const updateLedger = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    // If opening_balance/current balance is provided, we need to adjust it.
    // This is a "Manual Override" which posts a difference adjustment.
    if (data.opening_balance !== undefined) {
        return prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const ledger = yield tx.ledger.findUnique({ where: { id }, include: { head: true } });
            if (!ledger)
                throw new Error("Ledger not found");
            // Calculate Difference
            const diff = data.opening_balance - ledger.balance;
            if (Math.abs(diff) > 0.01) {
                // Find Adjustment Ledger
                const adjustmentLedger = yield tx.ledger.findFirst({ where: { name: 'Opening Balance Adjustment' } });
                if (!adjustmentLedger)
                    throw new Error("System Ledger 'Opening Balance Adjustment' not found.");
                const isDebitNature = ['ASSET', 'EXPENSE'].includes(ledger.head.type);
                // If Asset/Expense: Increase (Debit) means Ledger Dr, Adj Cr. Decrease (Credit) means Ledger Cr, Adj Dr.
                // If Liab/Income: Increase (Credit) means Ledger Cr, Adj Dr. Decrease (Debit) means Ledger Dr, Adj Cr.
                // Let's simplify: 
                // We want to change Balance by `diff` amount.
                // If diff is Positive (+1000): We treat it as "Adding to Balance".
                // In our simplified Model: Balance = Dr - Cr (Assets) OR Cr - Dr (Liabilities).
                // Actually the `createJournalEntry` logic updates balance: 
                // Dr -> Balance + (Increment)
                // Cr -> Balance - (Decrement)
                // Wait, looking at `createJournalEntry`:
                /*
                   await tx.ledger.update({ where: { id: data.to_ledger_id }, data: { balance: { increment: data.amount } } });
                   await tx.ledger.update({ where: { id: data.from_ledger_id }, data: { balance: { decrement: data.amount } } });
                */
                // This implies ALL ledgers increase on Debit and decrease on Credit? 
                // No, that's only true for Assets. Liabilities should Increase on Credit.
                // Current logic seems to treat Balance as a signed value where Positive = Debit?
                // Let's assume the previous `createJournalEntry` logic (Lines 186-194) forces this "Dr = + / Cr = -" model.
                // So if I want to increase balance from 100 to 200 (diff +100), I need to Debit this ledger.
                let debitLedgerId, creditLedgerId;
                if (diff > 0) {
                    // Need to Increase Balance (Debit this ledger)
                    debitLedgerId = ledger.id;
                    creditLedgerId = adjustmentLedger.id;
                }
                else {
                    // Need to Decrease Balance (Credit this ledger)
                    debitLedgerId = adjustmentLedger.id;
                    creditLedgerId = ledger.id;
                }
                yield createJournalEntry(tx, {
                    date: new Date(),
                    description: `Manual Balance Update from ${ledger.balance} to ${data.opening_balance}`,
                    amount: Math.abs(diff),
                    type: 'JOURNAL',
                    debit_ledger_id: debitLedgerId,
                    credit_ledger_id: creditLedgerId,
                    reference: 'MANUAL_EDIT'
                });
            }
            // Update Metadata
            const { opening_balance } = data, metaData = __rest(data, ["opening_balance"]);
            return tx.ledger.update({
                where: { id },
                data: metaData
            });
        }));
    }
    return prisma_1.default.ledger.update({
        where: { id },
        data
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
    const staff = yield prisma_1.default.user.findMany({ where: { role: { not: 'ADMIN' } } });
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
const getTransactions = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 20, startDate, endDate) {
    const whereClause = {};
    if (startDate && endDate) {
        whereClause.date = {
            gte: startDate,
            lte: endDate
        };
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
            date: tx.date,
            description: tx.description,
            type: tx.type,
            amount: tx.amount,
            reference: tx.reference,
            created_by: 'System', // Schema relation missing
            debit_ledgers: debitLines.map((l) => l.ledger.name).join(', '),
            credit_ledgers: creditLines.map((l) => l.ledger.name).join(', ')
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
