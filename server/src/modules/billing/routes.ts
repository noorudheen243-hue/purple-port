import { Router } from 'express';
import * as InvoiceController from './invoice.controller';
import { protect, authorize } from '../auth/middleware';

const router = Router();

// /api/billing/invoices...
router.post('/invoices', protect, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), InvoiceController.createInvoice);
router.get('/invoices', protect, InvoiceController.getInvoices);
router.get('/invoices/:id', protect, InvoiceController.getInvoiceById);
router.patch('/invoices/:id/status', protect, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), InvoiceController.updateInvoiceStatus);

export default router;
