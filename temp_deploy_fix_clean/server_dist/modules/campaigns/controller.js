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
exports.updateCampaign = exports.getCampaignById = exports.getCampaigns = exports.createCampaign = void 0;
const zod_1 = require("zod");
const campaignService = __importStar(require("./service"));
const createCampaignSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    client_id: zod_1.z.string().uuid(),
    start_date: zod_1.z.string().transform(str => new Date(str)),
    end_date: zod_1.z.string().transform(str => new Date(str)),
    goals: zod_1.z.string().optional(),
    budget: zod_1.z.number().optional(),
});
const createCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = createCampaignSchema.parse(req.body);
        // Ensure client exists? Prisma will throw if not, but good to check.
        // For now relying on Prisma constraints.
        const campaign = yield campaignService.createCampaign({
            title: validatedData.title,
            start_date: validatedData.start_date,
            end_date: validatedData.end_date,
            goals: validatedData.goals,
            budget: validatedData.budget,
            client: { connect: { id: validatedData.client_id } },
        });
        res.status(201).json(campaign);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ message: error.errors });
        }
        else {
            res.status(500).json({ message: error.message });
        }
    }
});
exports.createCampaign = createCampaign;
const getCampaigns = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { client_id, month } = req.query;
        const campaigns = yield campaignService.getCampaigns(client_id, month);
        res.json(campaigns);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getCampaigns = getCampaigns;
const getCampaignById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const campaign = yield campaignService.getCampaignById(req.params.id);
        if (!campaign) {
            res.status(404).json({ message: 'Campaign not found' });
            return;
        }
        res.json(campaign);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getCampaignById = getCampaignById;
const updateCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const campaign = yield campaignService.updateCampaign(req.params.id, req.body);
        res.json(campaign);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateCampaign = updateCampaign;
