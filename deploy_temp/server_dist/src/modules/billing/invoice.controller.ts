import { Request, Response } from 'express';
import * as InvoiceService from './invoice.service';

export const createInvoice = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user; // Auth middleware attaches this
        // Validation: Check required fields? Service does some, but basic body check good.
        if (!req.body.items || req.body.items.length === 0) {
            return res.status(400).json({ error: "Invoice must have at least one item." });
        }

        const invoice = await InvoiceService.createInvoice(req.body, user.id);
        res.status(201).json(invoice);
    } catch (error) {
        console.error("Create Invoice Error:", error);
        res.status(500).json({ error: "Failed to create invoice." });
    }
};

export const getInvoices = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        // If User is CLIENT, force filter by their linked client ID and generic rule (hide drafts)
        const isClient = user.role === 'CLIENT';
        const filterId = isClient ? user.linked_client_id : (req.query.clientId as string);

        const invoices = await InvoiceService.getInvoices(filterId, isClient);
        res.json(invoices);
    } catch (error) {
        console.error("Get Invoices Error:", error);
        res.status(500).json({ error: "Failed to fetch invoices." });
    }
};

export const getInvoiceById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const invoice = await InvoiceService.getInvoiceById(id);
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found." });
        }
        res.json(invoice);
    } catch (error) {
        console.error("Get Invoice Error:", error);
        res.status(500).json({ error: "Failed to fetch invoice." });
    }
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['DRAFT', 'SUBMITTED', 'PAID'].includes(status)) {
            return res.status(400).json({ error: "Invalid status." });
        }

        const updated = await InvoiceService.updateInvoiceStatus(id, status);
        res.json(updated);
    } catch (error) {
        console.error("Update Invoice Status Error:", error);
        res.status(500).json({ error: "Failed to update invoice status." });
    }
};

export const deleteInvoice = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await InvoiceService.deleteInvoice(id);
        res.json({ message: 'Invoice deleted successfully.' });
    } catch (error: any) {
        const isClientError = error?.message?.includes('DRAFT') || error?.message?.includes('not found');
        console.error("Delete Invoice Error:", error);
        res.status(isClientError ? 400 : 500).json({ error: error?.message || 'Failed to delete invoice.' });
    }
};
