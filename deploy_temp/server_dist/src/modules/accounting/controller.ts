import { Request, Response } from 'express';
import * as AccountingService from './service';
import { generateLedgerCode } from '../../utils/ledgerIdGenerator';
import prisma from '../../utils/prisma';
import * as BackupService from './backup.service';
import { z } from 'zod';

const createLedgerSchema = z.object({
    name: z.string().min(3),
    head_id: z.string().uuid(),
    entity_type: z.enum(['CLIENT', 'VENDOR', 'BANK', 'CASH', 'INCOME', 'EXPENSE', 'ADJUSTMENT', 'INTERNAL']),
    description: z.string().optional(),
    opening_balance: z.number().min(0).default(0),
    opening_balance_date: z.string().optional().transform(str => str ? new Date(str) : undefined)
});

const transactionSchema = z.object({
    date: z.string().transform(str => new Date(str)),
    description: z.string().min(3),
    amount: z.number().positive(),
    type: z.enum(['PAYMENT', 'RECEIPT', 'CONTRA', 'EXPENSE', 'INCOME', 'JOURNAL']),
    from_ledger_id: z.string().uuid(), // Credit
    to_ledger_id: z.string().uuid(),   // Debit
    reference: z.string().optional(),
    nature: z.enum(['GENERAL', 'ADVANCE_RECEIVED', 'ADVANCE_PAID']).optional(),
    entity_id: z.string().optional()
});

export const getLedgers = async (req: Request, res: Response) => {
    try {
        const ledgers = await AccountingService.getLedgers();
        res.json(ledgers);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch ledgers" });
    }
};

export const getNextLedgerCode = async (req: Request, res: Response) => {
    try {
        const nextCode = await generateLedgerCode(prisma);
        res.json({ nextCode });
    } catch (error) {
        res.status(500).json({ message: "Failed to generate next ledger code" });
    }
};

export const createLedger = async (req: Request, res: Response) => {
    try {
        const data = createLedgerSchema.parse(req.body);
        const ledger = await AccountingService.createLedger(data);
        res.status(201).json(ledger);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create ledger", error: (error as Error).message });
    }
};

export const recordTransaction = async (req: Request, res: Response) => {
    try {
        const data = transactionSchema.parse(req.body);
        // @ts-ignore - user is attached by auth middleware
        const userId = req.user?.id || 'SYSTEM';

        const entry = await AccountingService.recordTransaction({
            ...data,
            user_id: userId
        });
        res.status(201).json(entry);
    } catch (error) {
        console.error("TRANSACTION_ERROR:", error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: "Failed to record transaction", error: (error as Error).message });
    }
};

export const getAccountHeads = async (req: Request, res: Response) => {
    try {
        const heads = await AccountingService.getAccountHeads();
        res.json(heads);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch account heads" });
    }
};

// getInvoices moved to Billing Module

export const updateLedger = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await AccountingService.updateLedger(id, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Failed to update ledger", error: (error as Error).message });
    }
};

export const deleteLedger = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await AccountingService.deleteLedger(id);
        res.status(200).json({ message: "Ledger deleted successfully" });
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const getStatement = async (req: Request, res: Response) => {
    try {
        const { ledger_id, start_date, end_date } = req.body;
        const stmt = await AccountingService.getAccountStatement(ledger_id, new Date(start_date), new Date(end_date));
        res.json(stmt);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getOverview = async (req: Request, res: Response) => {
    try {
        const data = await AccountingService.getFinancialOverview();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const syncLedgers = async (req: Request, res: Response) => {
    try {
        // Admin Only
        if (req.user!.role !== 'ADMIN' && req.user!.role !== 'DEVELOPER_ADMIN') {
            return res.status(403).json({ message: "Forbidden" });
        }
        const result = await AccountingService.syncEntityLedgers();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
        const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
        const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

        let clientId = req.user?.role === 'CLIENT' ? (req.user as any).linked_client_id : undefined;

        console.log('DEBUG_TRANSACTIONS:', {
            role: req.user?.role,
            userId: req.user?.id,
            linkedClient: (req.user as any)?.linked_client_id,
            queryClient: req.query.client_id
        });

        // Allow Admins/Managers to view specific client transactions
        if (req.user?.role !== 'CLIENT' && req.query.client_id) {
            clientId = req.query.client_id as string;
        }

        console.log('DEBUG_TRANSACTIONS_FINAL_ID:', clientId);

        const transactions = await AccountingService.getTransactions(limit, startDate, endDate, clientId);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch transactions", error: (error as Error).message });
    }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await AccountingService.deleteTransaction(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updateTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await AccountingService.updateTransaction(id, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

// --- BACKUP & RESTORE ---

export const downloadExcelBackup = async (req: Request, res: Response) => {
    try {
        // Only allow Admins to download full physical backups
        if (req.user!.role !== 'ADMIN' && req.user!.role !== 'DEVELOPER_ADMIN') {
            return res.status(403).json({ message: "Forbidden: Admin access required." });
        }

        const buffer = await BackupService.generateExcelBackup();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Account_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ message: "Failed to generate Excel backup.", error: (error as Error).message });
    }
};

export const downloadJSONBackup = async (req: Request, res: Response) => {
    try {
        if (req.user!.role !== 'ADMIN' && req.user!.role !== 'DEVELOPER_ADMIN') {
            return res.status(403).json({ message: "Forbidden: Admin access required." });
        }

        const data = await BackupService.generateJSONBackup();

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=Account_System_Backup_${new Date().toISOString().split('T')[0]}.json`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Failed to generate JSON backup.", error: (error as Error).message });
    }
};

export const restoreBackup = async (req: Request, res: Response) => {
    try {
        if (req.user!.role !== 'ADMIN' && req.user!.role !== 'DEVELOPER_ADMIN') {
            return res.status(403).json({ message: "Forbidden: Admin access required." });
        }

        const backupData = req.body;
        if (!backupData || !backupData.version) {
            return res.status(400).json({ message: "Invalid backup file format." });
        }

        const result = await BackupService.restoreJSONBackup(backupData);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Failed to restore backup.", error: (error as Error).message });
    }
};
