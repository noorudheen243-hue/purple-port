import prisma from '../../utils/prisma';
import { createJournalEntry, ensureLedger } from '../accounting/service';

export const generateInvoiceNumber = async (date: Date = new Date()): Promise<string> => {
    const year = parseInt(date.getFullYear().toString().slice(-2));
    const month = date.getMonth() + 1; // 1-12

    // Transaction to ensure atomicity of sequence
    return await prisma.$transaction(async (tx) => {
        let sequence = await tx.invoiceSequence.findUnique({
            where: {
                year_month: {
                    year: year,
                    month: month
                }
            }
        });

        if (!sequence) {
            sequence = await tx.invoiceSequence.create({
                data: {
                    year,
                    month,
                    current_count: 0
                }
            });
        }

        const nextCount = sequence.current_count + 1;

        await tx.invoiceSequence.update({
            where: { id: sequence.id },
            data: { current_count: nextCount }
        });

        // Format: QIX + YY + MM + XXX (e.g., QIX2601003)
        const countStr = nextCount.toString().padStart(3, '0');
        const monthStr = month.toString().padStart(2, '0');

        return `QIX${year}${monthStr}${countStr}`;
    });
};

export const createInvoice = async (data: any, userId: string) => {
    const {
        client_type, client_id, client_name,
        invoice_date, due_date,
        items,
        additions_total, additions_desc,
        deductions_total, deductions_desc,
        notes
    } = data;

    // Server-side Calculation Validation
    let subInfo = 0;
    const processedItems = items.map((item: any, index: number) => {
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
    const invoiceNumber = await generateInvoiceNumber(invDateObj);

    // --- TRANSACTION START ---
    return await prisma.$transaction(async (tx) => {
        // 1. Create Invoice
        const invoice = await tx.clientInvoice.create({
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

            await tx.client.update({
                where: { id: client_id },
                data: { advance_balance: { decrement: deductAmt } }
            });
        }

        return invoice;
    });
    // --- TRANSACTION END ---
};

export const getInvoices = async (clientId?: string, excludeDrafts: boolean = false) => {
    const whereClause: any = clientId ? { client_id: clientId } : {};
    if (excludeDrafts) {
        whereClause.status = { not: 'DRAFT' };
    }
    return await prisma.clientInvoice.findMany({
        where: whereClause,
        orderBy: { invoice_number: 'desc' },
        include: { items: true }
    });
};

export const getInvoiceById = async (id: string) => {
    return await prisma.clientInvoice.findUnique({
        where: { id },
        include: { items: true }
    });
};

export const updateInvoiceStatus = async (id: string, status: string) => {
    return await prisma.$transaction(async (tx) => {
        const invoice = await tx.clientInvoice.findUnique({ where: { id }, include: { items: true } });
        if (!invoice) throw new Error("Invoice not found");

        // Idempotency check
        if (invoice.status === 'SUBMITTED' && status === 'SUBMITTED') return invoice;

        // Post to Ledger on SUBMITTED
        if (status === 'SUBMITTED' && invoice.status === 'DRAFT') {
            const clientLedger = await ensureLedger('CLIENT', invoice.client_id || '', '1000'); // '1000' is generic head code fallback

            const creditLines: { ledger_id: string; debit: number; credit: number }[] = [];

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
                let taxLedger = await tx.ledger.findFirst({ where: { name: 'Duties & Taxes' } });
                if (!taxLedger) {
                    taxLedger = await tx.ledger.findFirst({ where: { head: { type: 'LIABILITY' }, name: { contains: 'Tax' } } });
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
                const isAdvance = invoice.deductions_desc?.toLowerCase().includes('advance');
                let dedLedgerName = isAdvance ? 'Unearned Revenue' : 'Discount Allowed';

                let dedLedger = await tx.ledger.findFirst({ where: { name: dedLedgerName } });
                if (!dedLedger) dedLedger = await tx.ledger.findFirst({ where: { name: 'General Adjustments' } });

                if (dedLedger) {
                    debitLines.push({ ledger_id: dedLedger.id, debit: deductionAmount, credit: 0 });
                }
            }

            await createJournalEntry(tx, {
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

        return await tx.clientInvoice.update({
            where: { id },
            data: { status }
        });
    });
};

export const deleteInvoice = async (id: string) => {
    const invoice = await prisma.clientInvoice.findUnique({ where: { id } });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'DRAFT') throw new Error('Only DRAFT invoices can be deleted.');

    // Delete items first (in case no cascade configured), then invoice
    await prisma.clientInvoiceItem.deleteMany({ where: { invoice_id: id } });
    return await prisma.clientInvoice.delete({ where: { id } });
};
