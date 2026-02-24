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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInvoiceStatus = exports.getInvoiceById = exports.getInvoices = exports.createInvoice = void 0;
const InvoiceService = __importStar(require("./invoice.service"));
const createInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user; // Auth middleware attaches this
        // Validation: Check required fields? Service does some, but basic body check good.
        if (!req.body.items || req.body.items.length === 0) {
            return res.status(400).json({ error: "Invoice must have at least one item." });
        }
        const invoice = yield InvoiceService.createInvoice(req.body, user.id);
        res.status(201).json(invoice);
    }
    catch (error) {
        console.error("Create Invoice Error:", error);
        res.status(500).json({ error: "Failed to create invoice." });
    }
});
exports.createInvoice = createInvoice;
const getInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        // If User is CLIENT, force filter by their linked client ID and generic rule (hide drafts)
        const isClient = user.role === 'CLIENT';
        const filterId = isClient ? user.linked_client_id : req.query.clientId;
        const invoices = yield InvoiceService.getInvoices(filterId, isClient);
        res.json(invoices);
    }
    catch (error) {
        console.error("Get Invoices Error:", error);
        res.status(500).json({ error: "Failed to fetch invoices." });
    }
});
exports.getInvoices = getInvoices;
const getInvoiceById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const invoice = yield InvoiceService.getInvoiceById(id);
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found." });
        }
        res.json(invoice);
    }
    catch (error) {
        console.error("Get Invoice Error:", error);
        res.status(500).json({ error: "Failed to fetch invoice." });
    }
});
exports.getInvoiceById = getInvoiceById;
const updateInvoiceStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['DRAFT', 'SUBMITTED', 'PAID'].includes(status)) {
            return res.status(400).json({ error: "Invalid status." });
        }
        const updated = yield InvoiceService.updateInvoiceStatus(id, status);
        res.json(updated);
    }
    catch (error) {
        console.error("Update Invoice Status Error:", error);
        res.status(500).json({ error: "Failed to update invoice status." });
    }
});
exports.updateInvoiceStatus = updateInvoiceStatus;
