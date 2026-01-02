import { Router } from 'express';
import * as AccountingController from './controller';
import { protect, authorize } from '../auth/middleware';

const router = Router();

// Protect all routes
router.use(protect);

// Ledger Management (Admin Only)
// Ledger Management (Admin Only)
router.get('/ledgers', authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), AccountingController.getLedgers);
router.post('/ledgers', authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), AccountingController.createLedger);
router.put('/ledgers/:id', authorize('ADMIN', 'DEVELOPER_ADMIN'), AccountingController.updateLedger);
router.delete('/ledgers/:id', authorize('ADMIN', 'DEVELOPER_ADMIN'), AccountingController.deleteLedger);
router.get('/heads', authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), AccountingController.getAccountHeads);

// Transactions (Single Entry)
// Transactions
router.post('/transactions', authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), AccountingController.recordTransaction);
router.get('/transactions', authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), AccountingController.getTransactions);
router.put('/transactions/:id', authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), AccountingController.updateTransaction);
router.delete('/transactions/:id', authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), AccountingController.deleteTransaction);

// Reports & Automation
router.post('/reports/statement', authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), AccountingController.getStatement);
router.get('/reports/overview', authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), AccountingController.getOverview);
router.post('/sync-ledgers', authorize('ADMIN', 'DEVELOPER_ADMIN'), AccountingController.syncLedgers);

export default router;
