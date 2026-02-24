"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.restoreJSONBackup = exports.generateJSONBackup = exports.generateExcelBackup = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const xlsx = __importStar(require("xlsx"));
const generateExcelBackup = () => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Fetch Data
    const ledgers = yield prisma_1.default.ledger.findMany({
        include: { head: true }
    });
    const entries = yield prisma_1.default.journalEntry.findMany({
        include: {
            lines: {
                include: { ledger: true }
            }
        },
        orderBy: { date: 'asc' }
    });
    // 2. Format Sheet 1: Account Ledger with Balance
    const ledgerSheetData = ledgers.map(l => {
        var _a, _b;
        return ({
            'Ledger Code': l.ledger_code || 'N/A',
            'Ledger ID': l.id,
            'Name': l.name,
            'Type': ((_a = l.head) === null || _a === void 0 ? void 0 : _a.type) || 'N/A',
            'Head': ((_b = l.head) === null || _b === void 0 ? void 0 : _b.name) || 'N/A',
            'Entity Type': l.entity_type || 'N/A',
            'Balance': l.balance,
            'Currency': l.currency,
            'Status': l.status
        });
    });
    // 3. Format Sheet 2: Full Transaction History
    const transactionSheetData = [];
    entries.forEach(entry => {
        const debitLines = entry.lines.filter(l => l.debit > 0);
        const creditLines = entry.lines.filter(l => l.credit > 0);
        transactionSheetData.push({
            'Transaction ID': entry.transaction_number || entry.id,
            'Date': entry.date.toISOString().split('T')[0],
            'Description': entry.description,
            'Type': entry.type,
            'Amount': entry.amount,
            'Debit Ledgers': debitLines.map(l => l.ledger.name).join(' | '),
            'Credit Ledgers': creditLines.map(l => l.ledger.name).join(' | '),
            'Reference': entry.reference || 'N/A',
            'Nature': entry.nature || 'N/A'
        });
    });
    // 4. Format Sheet 3: Account Summary (Income & Expenses)
    let totalIncome = 0;
    let totalExpense = 0;
    const summarySheetData = [];
    ledgers.forEach(l => {
        var _a, _b;
        if (((_a = l.head) === null || _a === void 0 ? void 0 : _a.type) === 'INCOME') {
            totalIncome += Math.abs(l.balance);
            summarySheetData.push({ 'Category': 'Income', 'Ledger Name': l.name, 'Balance': Math.abs(l.balance) });
        }
        else if (((_b = l.head) === null || _b === void 0 ? void 0 : _b.type) === 'EXPENSE') {
            totalExpense += Math.abs(l.balance);
            summarySheetData.push({ 'Category': 'Expense', 'Ledger Name': l.name, 'Balance': Math.abs(l.balance) });
        }
    });
    // Add totals row
    summarySheetData.push({ 'Category': 'TOTAL', 'Ledger Name': 'Net Profit/Loss', 'Balance': totalIncome - totalExpense });
    // 5. Format Sheet 4: Cash & Bank Balances
    const cashBankSheetData = ledgers
        .filter(l => l.entity_type === 'BANK' || l.entity_type === 'CASH')
        .map(l => ({
        'Account Name': l.name,
        'Type': l.entity_type,
        'Balance': l.balance
    }));
    // 6. Create Workbook and Sheets
    const wb = xlsx.utils.book_new();
    const ws1 = xlsx.utils.json_to_sheet(ledgerSheetData);
    const ws2 = xlsx.utils.json_to_sheet(transactionSheetData);
    const ws3 = xlsx.utils.json_to_sheet(summarySheetData);
    const ws4 = xlsx.utils.json_to_sheet(cashBankSheetData);
    // Auto-size columns roughly
    const setColWidths = (ws, data) => {
        if (!data || data.length === 0)
            return;
        const keys = Object.keys(data[0]);
        const cols = keys.map(key => ({ wch: Math.max(20, key.length + 5) }));
        ws['!cols'] = cols;
    };
    setColWidths(ws1, ledgerSheetData);
    setColWidths(ws2, transactionSheetData);
    setColWidths(ws3, summarySheetData);
    setColWidths(ws4, cashBankSheetData);
    xlsx.utils.book_append_sheet(wb, ws1, '1. Account Ledger');
    xlsx.utils.book_append_sheet(wb, ws2, '2. Transaction History');
    xlsx.utils.book_append_sheet(wb, ws3, '3. Account Summary');
    xlsx.utils.book_append_sheet(wb, ws4, '4. Cash & Bank');
    // Generate buffer
    const excelBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    return excelBuffer;
});
exports.generateExcelBackup = generateExcelBackup;
const generateJSONBackup = () => __awaiter(void 0, void 0, void 0, function* () {
    // Export raw data for full restore capabilities
    const heads = yield prisma_1.default.accountHead.findMany();
    const ledgers = yield prisma_1.default.ledger.findMany();
    const entries = yield prisma_1.default.journalEntry.findMany();
    const lines = yield prisma_1.default.journalLine.findMany();
    const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        data: {
            accountHeads: heads,
            ledgers: ledgers,
            journalEntries: entries,
            journalLines: lines
        }
    };
    return backupData;
});
exports.generateJSONBackup = generateJSONBackup;
const restoreJSONBackup = (backupData) => __awaiter(void 0, void 0, void 0, function* () {
    if (!backupData || !backupData.data) {
        throw new Error("Invalid backup data format.");
    }
    const { accountHeads, ledgers, journalEntries, journalLines } = backupData.data;
    if (!Array.isArray(ledgers) || !Array.isArray(journalEntries) || !Array.isArray(journalLines)) {
        throw new Error("Invalid backup data structure. Arrays expected.");
    }
    // Wrap in a transaction to ensure atomicity
    yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Delete existing data in proper foreign key order
        yield tx.journalLine.deleteMany();
        // Disconnect invoices from journal entries before deleting to avoid errors if foreign key constraints are tricky
        yield tx.invoice.updateMany({
            where: { journal_entry_id: { not: null } },
            data: { journal_entry_id: null }
        });
        yield tx.journalEntry.deleteMany();
        yield tx.ledger.deleteMany();
        // Since AccountHeads are seeded, we generally shouldn't delete them unless the backup explicitly rewrites them.
        // Usually, it's safer to only restore Ledgers and Transactions, assuming AccountHeads match.
        // We will just verify Head IDs exist, or upsert them.
        if (Array.isArray(accountHeads) && accountHeads.length > 0) {
            yield tx.accountHead.deleteMany();
            for (const head of accountHeads) {
                yield tx.accountHead.create({ data: head });
            }
        }
        // 2. Insert Ledgers
        if (ledgers.length > 0) {
            yield tx.ledger.createMany({ data: ledgers });
        }
        // 3. Insert Journal Entries
        if (journalEntries.length > 0) {
            yield tx.journalEntry.createMany({ data: journalEntries });
        }
        // 4. Insert Journal Lines
        if (journalLines.length > 0) {
            yield tx.journalLine.createMany({ data: journalLines });
        }
    }));
    return { message: "System restored successfully from JSON backup." };
});
exports.restoreJSONBackup = restoreJSONBackup;
