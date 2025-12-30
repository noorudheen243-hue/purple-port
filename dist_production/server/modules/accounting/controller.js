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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransaction = exports.deleteTransaction = exports.getTransactions = exports.syncLedgers = exports.getOverview = exports.getStatement = exports.deleteLedger = exports.updateLedger = exports.getAccountHeads = exports.recordTransaction = exports.createLedger = exports.getLedgers = void 0;
const AccountingService = __importStar(require("./service"));
const zod_1 = require("zod");
const createLedgerSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    head_id: zod_1.z.string().uuid(),
    entity_type: zod_1.z.enum(['CLIENT', 'VENDOR', 'BANK', 'CASH', 'INCOME', 'EXPENSE', 'ADJUSTMENT', 'INTERNAL']),
    description: zod_1.z.string().optional(),
    opening_balance: zod_1.z.number().min(0).default(0),
    opening_balance_date: zod_1.z.string().optional().transform(str => str ? new Date(str) : undefined)
});
const transactionSchema = zod_1.z.object({
    date: zod_1.z.string().transform(str => new Date(str)),
    description: zod_1.z.string().min(3),
    amount: zod_1.z.number().positive(),
    type: zod_1.z.enum(['PAYMENT', 'RECEIPT', 'CONTRA', 'EXPENSE', 'INCOME', 'JOURNAL']),
    from_ledger_id: zod_1.z.string().uuid(), // Credit
    to_ledger_id: zod_1.z.string().uuid(), // Debit
    reference: zod_1.z.string().optional()
});
const getLedgers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ledgers = yield AccountingService.getLedgers();
        res.json(ledgers);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch ledgers" });
    }
});
exports.getLedgers = getLedgers;
const createLedger = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = createLedgerSchema.parse(req.body);
        const ledger = yield AccountingService.createLedger(data);
        res.status(201).json(ledger);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create ledger", error: error.message });
    }
});
exports.createLedger = createLedger;
const recordTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const data = transactionSchema.parse(req.body);
        // @ts-ignore - user is attached by auth middleware
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'SYSTEM';
        const entry = yield AccountingService.recordTransaction(Object.assign(Object.assign({}, data), { user_id: userId }));
        res.status(201).json(entry);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: "Failed to record transaction", error: error.message });
    }
});
exports.recordTransaction = recordTransaction;
const getAccountHeads = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const heads = yield AccountingService.getAccountHeads();
        res.json(heads);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch heads" });
    }
});
exports.getAccountHeads = getAccountHeads;
const updateLedger = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield AccountingService.updateLedger(id, req.body);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update ledger", error: error.message });
    }
});
exports.updateLedger = updateLedger;
const deleteLedger = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield AccountingService.deleteLedger(id);
        res.status(200).json({ message: "Ledger deleted successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.deleteLedger = deleteLedger;
const getStatement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ledger_id, start_date, end_date } = req.body;
        const stmt = yield AccountingService.getAccountStatement(ledger_id, new Date(start_date), new Date(end_date));
        res.json(stmt);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getStatement = getStatement;
const getOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield AccountingService.getFinancialOverview();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getOverview = getOverview;
const syncLedgers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield AccountingService.syncEntityLedgers();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.syncLedgers = syncLedgers;
const getTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const startDate = req.query.start_date ? new Date(req.query.start_date) : undefined;
        const endDate = req.query.end_date ? new Date(req.query.end_date) : undefined;
        const transactions = yield AccountingService.getTransactions(limit, startDate, endDate);
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch transactions", error: error.message });
    }
});
exports.getTransactions = getTransactions;
const deleteTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield AccountingService.deleteTransaction(id);
        res.status(200).json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.deleteTransaction = deleteTransaction;
const updateTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield AccountingService.updateTransaction(id, req.body);
        res.status(200).json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateTransaction = updateTransaction;
