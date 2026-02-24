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
const InvoiceController = __importStar(require("./invoice.controller"));
const middleware_1 = require("../auth/middleware");
const router = (0, express_1.Router)();
// /api/billing/invoices...
router.post('/invoices', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), InvoiceController.createInvoice);
router.get('/invoices', middleware_1.protect, InvoiceController.getInvoices);
router.get('/invoices/:id', middleware_1.protect, InvoiceController.getInvoiceById);
router.patch('/invoices/:id/status', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), InvoiceController.updateInvoiceStatus);
exports.default = router;
