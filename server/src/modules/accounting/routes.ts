import { Router } from 'express';
import * as AccountingController from './controller';
import { protect, authorize } from '../auth/middleware';

const router = Router();

// Protect all routes
router.use(protect);

// Ledger Management (Admin Only)
// Ledger Management (Admin Only)
router.get('/ledgers', authorize('ADMIN', 'MANAGER'), AccountingController.getLedgers);
router.post('/ledgers', authorize('ADMIN'), AccountingController.createLedger);
router.put('/ledgers/:id', authorize('ADMIN'), AccountingController.updateLedger);
router.delete('/ledgers/:id', authorize('ADMIN'), AccountingController.deleteLedger);
router.get('/heads', authorize('ADMIN', 'MANAGER'), AccountingController.getAccountHeads);

// Transactions (Single Entry)
// Transactions
router.post('/transactions', authorize('ADMIN', 'MANAGER'), AccountingController.recordTransaction);
router.get('/transactions', authorize('ADMIN', 'MANAGER'), AccountingController.getTransactions);
router.put('/transactions/:id', authorize('ADMIN', 'MANAGER'), AccountingController.updateTransaction);
router.delete('/transactions/:id', authorize('ADMIN', 'MANAGER'), AccountingController.deleteTransaction);

// Reports & Automation
router.post('/reports/statement', authorize('ADMIN', 'MANAGER'), AccountingController.getStatement);
router.get('/reports/overview', authorize('ADMIN', 'MANAGER'), AccountingController.getOverview);
router.post('/sync', authorize('ADMIN'), AccountingController.syncLedgers);

export default router;
