"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AccountingController = __importStar(require("./controller"));
const middleware_1 = require("../auth/middleware");
const roles_1 = require("../auth/roles");
const router = (0, express_1.Router)();
// Protect all routes
router.use(middleware_1.protect);
// Ledger Management (Admin Only)
// Ledger Management (Admin Only)
router.get('/ledgers', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.getLedgers);
router.get('/ledgers/next-code', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.getNextLedgerCode);
router.post('/ledgers', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.createLedger);
router.put('/ledgers/:id', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.updateLedger);
router.delete('/ledgers/:id', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.deleteLedger);
router.get('/heads', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.getAccountHeads);
// Transactions (Single Entry)
// Transactions
router.post('/transactions', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.recordTransaction);
router.get('/transactions', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.getTransactions);
// router.get('/invoices', AccountingController.getInvoices); // Moved to Billing
router.put('/transactions/:id', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.updateTransaction);
router.delete('/transactions/:id', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.deleteTransaction);
// Reports & Automation
router.post('/reports/statement', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.getStatement);
router.get('/reports/overview', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.getOverview);
router.post('/sync-ledgers', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.syncLedgers);
// Backup & Restore
router.get('/backup/excel', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.downloadExcelBackup);
router.get('/backup/json', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.downloadJSONBackup);
router.post('/backup/restore', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.DEVELOPER_ADMIN), AccountingController.restoreBackup);
exports.default = router;
