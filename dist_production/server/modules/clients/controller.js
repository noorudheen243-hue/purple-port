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
exports.deleteClient = exports.updateClient = exports.getClientById = exports.getClients = exports.createClient = void 0;
const zod_1 = require("zod");
const clientService = __importStar(require("./service"));
const createClientSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    industry: zod_1.z.string().optional().or(zod_1.z.literal('')),
    status: zod_1.z.enum(['LEAD', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'INACTIVE']).default('LEAD'),
    brand_colors: zod_1.z.any().optional(),
    logo_url: zod_1.z.string().optional().or(zod_1.z.literal('')),
    // Core Contacts
    contact_person: zod_1.z.string().optional().or(zod_1.z.literal('')),
    contact_number: zod_1.z.string().optional().or(zod_1.z.literal('')),
    company_email: zod_1.z.string().email().optional().or(zod_1.z.literal('')).or(zod_1.z.undefined()),
    // Operating Location
    operating_country: zod_1.z.string().optional().or(zod_1.z.literal('')).or(zod_1.z.undefined()),
    operating_state: zod_1.z.string().optional().or(zod_1.z.literal('')).or(zod_1.z.undefined()),
    // Extended JSON Fields
    service_engagement: zod_1.z.array(zod_1.z.string()).optional(),
    social_links: zod_1.z.record(zod_1.z.string()).optional(),
    competitor_info: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        website: zod_1.z.string().optional(),
        socials: zod_1.z.record(zod_1.z.string()).optional()
    })).optional(),
    customer_avatar: zod_1.z.object({
        description: zod_1.z.string().optional(),
        demographics: zod_1.z.string().optional(),
        pain_points: zod_1.z.string().optional(),
        buying_intent: zod_1.z.string().optional()
    }).optional(),
    account_manager_id: zod_1.z.string().optional().or(zod_1.z.literal('')),
    assigned_staff_ids: zod_1.z.array(zod_1.z.string()).optional(),
});
const createClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = createClientSchema.parse(req.body);
        // Transform JSON objects to Strings for SQLite
        // AND Clean empty strings to undefined
        const dbData = Object.assign(Object.assign({}, validatedData), { account_manager_id: validatedData.account_manager_id || undefined, logo_url: validatedData.logo_url || undefined, industry: validatedData.industry || undefined, contact_person: validatedData.contact_person || undefined, contact_number: validatedData.contact_number || undefined, company_email: validatedData.company_email || undefined, service_engagement: validatedData.service_engagement ? JSON.stringify(validatedData.service_engagement) : undefined, social_links: validatedData.social_links ? JSON.stringify(validatedData.social_links) : undefined, competitor_info: validatedData.competitor_info ? JSON.stringify(validatedData.competitor_info) : undefined, customer_avatar: validatedData.customer_avatar ? JSON.stringify(validatedData.customer_avatar) : undefined });
        // Remove the virtual field 'assigned_staff_ids' from direct mapping, handle in service
        delete dbData.assigned_staff_ids;
        const client = yield clientService.createClient(dbData, validatedData.assigned_staff_ids);
        res.status(201).json(client);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ message: error.errors });
        }
        else {
            console.error(error);
            res.status(500).json({ message: error.message });
        }
    }
});
exports.createClient = createClient;
const getClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const clients = yield clientService.getClients();
        res.json(clients);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getClients = getClients;
const getClientById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield clientService.getClientById(req.params.id);
        if (!client) {
            res.status(404).json({ message: 'Client not found' });
            return;
        }
        res.json(client);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getClientById = getClientById;
const updateClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = req.body; // Partial validation possible
        // Transform JSON objects to Strings for SQLite
        const dbData = Object.assign({}, validatedData);
        if (validatedData.service_engagement)
            dbData.service_engagement = JSON.stringify(validatedData.service_engagement);
        if (validatedData.social_links)
            dbData.social_links = JSON.stringify(validatedData.social_links);
        if (validatedData.competitor_info)
            dbData.competitor_info = JSON.stringify(validatedData.competitor_info);
        if (validatedData.customer_avatar)
            dbData.customer_avatar = JSON.stringify(validatedData.customer_avatar);
        const client = yield clientService.updateClient(req.params.id, dbData);
        res.json(client);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateClient = updateClient;
const deleteClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield clientService.deleteClient(req.params.id);
        res.json({ message: 'Client deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteClient = deleteClient;
