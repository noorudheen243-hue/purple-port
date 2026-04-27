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
router.get('/ledgers/next-code', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.getNextLedgerCode);
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
router.post('/ensure-ledger', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.ensureEntityLedger);


// Backup & Restore
router.get('/backup/excel', authorize(ROLES.ADMIN, ROLES.DEVELOPER_ADMIN), AccountingController.downloadExcelBackup);
router.get('/backup/json', authorize(ROLES.ADMIN, ROLES.DEVELOPER_ADMIN), AccountingController.downloadJSONBackup);
router.post('/backup/restore', authorize(ROLES.ADMIN, ROLES.DEVELOPER_ADMIN), AccountingController.restoreBackup);

// Unified Ledger (New System)
router.get('/unified/ledgers', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.getUnifiedLedgers);
router.post('/unified/ledgers', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.createUnifiedLedger);
router.post('/unified/transactions', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.recordUnifiedTransaction);
router.post('/unified/reports/statement', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.getUnifiedStatement);
router.get('/unified/ledgers/:id/balance', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), AccountingController.getUnifiedBalance);
router.get('/unified/status', AccountingController.checkUnifiedEnabled);

export default router;
