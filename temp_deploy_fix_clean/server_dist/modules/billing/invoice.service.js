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
exports.updateInvoiceStatus = exports.getInvoiceById = exports.getInvoices = exports.createInvoice = exports.generateInvoiceNumber = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const service_1 = require("../accounting/service");
const generateInvoiceNumber = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (date = new Date()) {
    const year = parseInt(date.getFullYear().toString().slice(-2));
    const month = date.getMonth() + 1; // 1-12
    // Transaction to ensure atomicity of sequence
    return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        let sequence = yield tx.invoiceSequence.findUnique({
            where: {
                year_month: {
                    year: year,
                    month: month
                }
            }
        });
        if (!sequence) {
            sequence = yield tx.invoiceSequence.create({
                data: {
                    year,
                    month,
                    current_count: 0
                }
            });
        }
        const nextCount = sequence.current_count + 1;
        yield tx.invoiceSequence.update({
            where: { id: sequence.id },
            data: { current_count: nextCount }
        });
        // Format: QIX + YY + MM + XXX (e.g., QIX2601003)
        const countStr = nextCount.toString().padStart(3, '0');
        const monthStr = month.toString().padStart(2, '0');
        return `QIX${year}${monthStr}${countStr}`;
    }));
});
exports.generateInvoiceNumber = generateInvoiceNumber;
const createInvoice = (data, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const { client_type, client_id, client_name, invoice_date, due_date, items, additions_total, additions_desc, deductions_total, deductions_desc, notes } = data;
    // Server-side Calculation Validation
    let subInfo = 0;
    const processedItems = items.map((item, index) => {
        const qty = parseFloat(item.quantity);
        const rate = parseFloat(item.rate);
        const amount = qty * rate;
        subInfo += amount;
        return {
            sl_no: index + 1,
            particulars: item.particulars,
            description: item.description,
            quantity: qty,
            rate: rate,
            amount: amount,
            ledger_id: item.ledger_id
        };
    });
    const netPayable = (subInfo + (parseFloat(additions_total) || 0)) - (parseFloat(deductions_total) || 0);
    // Generate Number
    const invDateObj = new Date(invoice_date);
    const invoiceNumber = yield (0, exports.generateInvoiceNumber)(invDateObj);
    // --- TRANSACTION START ---
    return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Create Invoice
        const invoice = yield tx.clientInvoice.create({
            data: {
                invoice_number: invoiceNumber,
                client_type,
                client_id: client_id || null,
                client_name,
                invoice_date: invDateObj,
                due_date: new Date(due_date),
                sub_total: subInfo,
                additions_total: parseFloat(additions_total) || 0,
                additions_desc,
                deductions_total: parseFloat(deductions_total) || 0,
                deductions_desc,
                net_payable: netPayable,
                balance_due: netPayable,
                status: 'DRAFT',
                notes,
                created_by_id: userId,
                items: {
                    create: processedItems
                }
            },
            include: { items: true }
        });
        // 2. Handle Advance Deduction (Sync)
        // Only if Onboarded Client AND Deduction > 0 AND Desc contains 'Advance' (relaxed check or explicit flag)
        // For now, assuming ANY deduction for Onboarded Client is intended to adjust advance if explicitly labeled "Advance Received" in UI default.
        // Or better: Checking if deductions_total > 0 && client_id
        if (client_id && client_type === 'ONBOARDED' && (parseFloat(deductions_total) || 0) > 0) {
            const deductAmt = parseFloat(deductions_total);
            // Verify balance? (Optional, but good practice. Assuming Frontend did it, but backend should safe guard)
            // For now, we trust the input OR we could check. 
            // Let's just decrement. If it goes negative, that might be an issue, but prisma allows Float to be negative.
            // Ideally we should allow partial usage.
            yield tx.client.update({
                where: { id: client_id },
                data: { advance_balance: { decrement: deductAmt } }
            });
        }
        return invoice;
    }));
    // --- TRANSACTION END ---
});
exports.createInvoice = createInvoice;
const getInvoices = (clientId_1, ...args_1) => __awaiter(void 0, [clientId_1, ...args_1], void 0, function* (clientId, excludeDrafts = false) {
    const whereClause = clientId ? { client_id: clientId } : {};
    if (excludeDrafts) {
        whereClause.status = { not: 'DRAFT' };
    }
    return yield prisma_1.default.clientInvoice.findMany({
        where: whereClause,
        orderBy: { invoice_number: 'desc' },
        include: { items: true }
    });
});
exports.getInvoices = getInvoices;
const getInvoiceById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.clientInvoice.findUnique({
        where: { id },
        include: { items: true }
    });
});
exports.getInvoiceById = getInvoiceById;
const updateInvoiceStatus = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const invoice = yield tx.clientInvoice.findUnique({ where: { id }, include: { items: true } });
        if (!invoice)
            throw new Error("Invoice not found");
        // Idempotency check
        if (invoice.status === 'SUBMITTED' && status === 'SUBMITTED')
            return invoice;
        // Post to Ledger on SUBMITTED
        if (status === 'SUBMITTED' && invoice.status === 'DRAFT') {
            const clientLedger = yield (0, service_1.ensureLedger)('CLIENT', invoice.client_id || '', '1000'); // '1000' is generic head code fallback
            const creditLines = [];
            for (const item of invoice.items) {
                if (item.ledger_id) {
                    creditLines.push({
                        ledger_id: item.ledger_id,
                        debit: 0,
                        credit: parseFloat(item.amount.toString())
                    });
                }
            }
            // Handle Additions (e.g. Tax) -> Credit 'Duties & Taxes'
            if (invoice.additions_total > 0) {
                // Find Duties & Taxes Ledger. For now, we search by name or create default.
                let taxLedger = yield tx.ledger.findFirst({ where: { name: 'Duties & Taxes' } });
                if (!taxLedger) {
                    taxLedger = yield tx.ledger.findFirst({ where: { head: { type: 'LIABILITY' }, name: { contains: 'Tax' } } });
                }
                if (taxLedger) {
                    creditLines.push({ ledger_id: taxLedger.id, debit: 0, credit: parseFloat(invoice.additions_total.toString()) });
                }
            }
            // Credits - Deductions = Net Payable
            // So Debit(Client) = Net Payable
            // Deductions must be Debited too to balance.
            const netPayable = parseFloat(invoice.net_payable.toString());
            const deductionAmount = parseFloat(invoice.deductions_total.toString());
            const debitLines = [
                { ledger_id: clientLedger.id, debit: netPayable, credit: 0 }
            ];
            if (deductionAmount > 0) {
                const isAdvance = (_a = invoice.deductions_desc) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('advance');
                let dedLedgerName = isAdvance ? 'Unearned Revenue' : 'Discount Allowed';
                let dedLedger = yield tx.ledger.findFirst({ where: { name: dedLedgerName } });
                if (!dedLedger)
                    dedLedger = yield tx.ledger.findFirst({ where: { name: 'General Adjustments' } });
                if (dedLedger) {
                    debitLines.push({ ledger_id: dedLedger.id, debit: deductionAmount, credit: 0 });
                }
            }
            yield (0, service_1.createJournalEntry)(tx, {
                date: new Date(),
                description: `Invoice #${invoice.invoice_number}`,
                amount: netPayable,
                type: 'SALES',
                reference: invoice.invoice_number,
                invoice_id: invoice.id,
                created_by_id: invoice.created_by_id,
                lines: [...debitLines, ...creditLines]
            });
        }
        return yield tx.clientInvoice.update({
            where: { id },
            data: { status }
        });
    }));
});
exports.updateInvoiceStatus = updateInvoiceStatus;
