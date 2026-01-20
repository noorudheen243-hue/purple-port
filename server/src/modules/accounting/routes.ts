import { Router } from 'express';
import * as AccountingController from './controller';
import { protect, authorize } from '../auth/middleware';
import { ROLES } from '../auth/roles';

const router = Router();

// Protect all routes
router.use(protect);

// Ledger Management (Admin Only)
// Ledger Management (Admin Only)
router.get('/ledgers', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.getLedgers);
router.post('/ledgers', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.createLedger);
router.put('/ledgers/:id', authorize(ROLES.ADMIN, ROLES.DEVELOPER_ADMIN), AccountingController.updateLedger);
router.delete('/ledgers/:id', authorize(ROLES.ADMIN, ROLES.DEVELOPER_ADMIN), AccountingController.deleteLedger);
router.get('/heads', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.getAccountHeads);

// Transactions (Single Entry)
// Transactions
router.post('/transactions', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.recordTransaction);
router.get('/transactions', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.getTransactions);
// router.get('/invoices', AccountingController.getInvoices); // Moved to Billing
router.put('/transactions/:id', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.updateTransaction);
router.delete('/transactions/:id', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.deleteTransaction);

// Reports & Automation
router.post('/reports/statement', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.getStatement);
router.get('/reports/overview', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.getOverview);
router.post('/sync-ledgers', authorize(ROLES.ADMIN, ROLES.DEVELOPER_ADMIN), AccountingController.syncLedgers);

export default router;
