import prisma from '../../utils/prisma';
import * as xlsx from 'xlsx';

export const generateExcelBackup = async () => {
    // 1. Fetch Data
    const ledgers = await prisma.ledger.findMany({
        include: { head: true }
    });

    const entries = await prisma.journalEntry.findMany({
        include: {
            lines: {
                include: { ledger: true }
            }
        },
        orderBy: { date: 'asc' }
    });

    // 2. Format Sheet 1: Account Ledger with Balance
    const ledgerSheetData = ledgers.map(l => ({
        'Ledger Code': l.ledger_code || 'N/A',
        'Ledger ID': l.id,
        'Name': l.name,
        'Type': l.head?.type || 'N/A',
        'Head': l.head?.name || 'N/A',
        'Entity Type': l.entity_type || 'N/A',
        'Balance': l.balance,
        'Currency': l.currency,
        'Status': l.status
    }));

    // 3. Format Sheet 2: Full Transaction History
    const transactionSheetData: any[] = [];
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
    const summarySheetData: any[] = [];

    ledgers.forEach(l => {
        if (l.head?.type === 'INCOME') {
            totalIncome += Math.abs(l.balance);
            summarySheetData.push({ 'Category': 'Income', 'Ledger Name': l.name, 'Balance': Math.abs(l.balance) });
        } else if (l.head?.type === 'EXPENSE') {
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
    const setColWidths = (ws: xlsx.WorkSheet, data: any[]) => {
        if (!data || data.length === 0) return;
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
};

export const generateJSONBackup = async () => {
    // Export raw data for full restore capabilities
    const heads = await prisma.accountHead.findMany();
    const ledgers = await prisma.ledger.findMany();
    const entries = await prisma.journalEntry.findMany();
    const lines = await prisma.journalLine.findMany();

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
};

export const restoreJSONBackup = async (backupData: any) => {
    if (!backupData || !backupData.data) {
        throw new Error("Invalid backup data format.");
    }

    const { accountHeads, ledgers, journalEntries, journalLines } = backupData.data;

    if (!Array.isArray(ledgers) || !Array.isArray(journalEntries) || !Array.isArray(journalLines)) {
        throw new Error("Invalid backup data structure. Arrays expected.");
    }

    // Wrap in a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
        // 1. Delete existing data in proper foreign key order
        await tx.journalLine.deleteMany();

        // Disconnect invoices from journal entries before deleting to avoid errors if foreign key constraints are tricky
        await tx.invoice.updateMany({
            where: { journal_entry_id: { not: null } },
            data: { journal_entry_id: null }
        });

        await tx.journalEntry.deleteMany();
        await tx.ledger.deleteMany();
        // Since AccountHeads are seeded, we generally shouldn't delete them unless the backup explicitly rewrites them.
        // Usually, it's safer to only restore Ledgers and Transactions, assuming AccountHeads match.
        // We will just verify Head IDs exist, or upsert them.

        if (Array.isArray(accountHeads) && accountHeads.length > 0) {
            await tx.accountHead.deleteMany();
            for (const head of accountHeads) {
                await tx.accountHead.create({ data: head });
            }
        }

        // 2. Insert Ledgers
        if (ledgers.length > 0) {
            await tx.ledger.createMany({ data: ledgers });
        }

        // 3. Insert Journal Entries
        if (journalEntries.length > 0) {
            await tx.journalEntry.createMany({ data: journalEntries });
        }

        // 4. Insert Journal Lines
        if (journalLines.length > 0) {
            await tx.journalLine.createMany({ data: journalLines });
        }
    });

    return { message: "System restored successfully from JSON backup." };
};
