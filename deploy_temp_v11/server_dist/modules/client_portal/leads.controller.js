"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLead = exports.updateLead = exports.createLead = exports.getLeads = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
// Helper to validate client context for security
const getValidatedClientId = (req) => {
    const user = req.user;
    const requestedClientId = req.query.clientId || req.body.client_id;
    if (!requestedClientId)
        return null;
    // Logic:
    // If user is CLIENT, they can ONLY access their own linked_client_id.
    // If user is INTERNAL (Admin/Manager/Staff), they can access any clientId provided.
    if (user.role === 'CLIENT') {
        if (requestedClientId !== user.linked_client_id) {
            return null; // Security violation
        }
    }
    return requestedClientId;
};
const getLeads = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId)
            return res.status(403).json({ message: "Access Denied: Invalid Client Context" });
        const leads = yield prisma_1.default.lead.findMany({
            where: { client_id: clientId },
            include: { follow_ups: { orderBy: { follow_up_number: 'asc' } } },
            orderBy: { date: 'desc' }
        });
        res.json(leads);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getLeads = getLeads;
const createLead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId)
            return res.status(403).json({ message: "Access Denied: Invalid Client Context" });
        const { date, campaign_name, phone, name, address, quality, status, is_positive, follow_ups } = req.body;
        const lead = yield prisma_1.default.lead.create({
            data: {
                client_id: clientId,
                date: date ? new Date(date) : undefined,
                campaign_name,
                phone,
                name,
                address,
                quality,
                status,
                is_positive,
                follow_ups: {
                    create: follow_ups === null || follow_ups === void 0 ? void 0 : follow_ups.map((f) => ({
                        follow_up_number: f.follow_up_number,
                        status: f.status,
                        notes: f.notes,
                        channel: f.channel || 'Phone Call',
                        date: f.date ? new Date(f.date) : new Date()
                    }))
                }
            },
            include: { follow_ups: true }
        });
        res.json(lead);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createLead = createLead;
const updateLead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const clientId = getValidatedClientId(req);
        if (!clientId)
            return res.status(403).json({ message: "Access Denied: Invalid Client Context" });
        const { date, campaign_name, phone, name, address, quality, status, is_positive, follow_ups } = req.body;
        const lead = yield prisma_1.default.lead.update({
            where: { id },
            data: {
                date: date ? new Date(date) : undefined,
                campaign_name,
                phone,
                name,
                address,
                quality,
                status,
                is_positive
            }
        });
        if (follow_ups) {
            // Simple sync: delete old and create new
            yield prisma_1.default.leadFollowUp.deleteMany({ where: { lead_id: id } });
            if (follow_ups.length > 0) {
                yield prisma_1.default.leadFollowUp.createMany({
                    data: follow_ups.map((f) => ({
                        lead_id: id,
                        follow_up_number: f.follow_up_number,
                        status: f.status,
                        notes: f.notes,
                        channel: f.channel || 'Phone Call',
                        date: f.date ? new Date(f.date) : new Date()
                    }))
                });
            }
        }
        const updatedLead = yield prisma_1.default.lead.findUnique({
            where: { id },
            include: { follow_ups: { orderBy: { follow_up_number: 'asc' } } }
        });
        res.json(updatedLead);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateLead = updateLead;
const deleteLead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const lead = yield prisma_1.default.lead.findUnique({ where: { id } });
        if (!lead)
            return res.status(404).json({ message: "Lead not found" });
        const user = req.user;
        if (user.role === 'CLIENT' && lead.client_id !== user.linked_client_id) {
            return res.status(403).json({ message: "Access Denied" });
        }
        yield prisma_1.default.lead.delete({ where: { id } });
        res.json({ message: "Deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteLead = deleteLead;
