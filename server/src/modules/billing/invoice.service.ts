import prisma from '../../utils/prisma';

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
    // If status becomes SUBMITTED, maybe lock it?
    // For now, just update.
    return await prisma.clientInvoice.update({
        where: { id },
        data: { status }
    });
};
