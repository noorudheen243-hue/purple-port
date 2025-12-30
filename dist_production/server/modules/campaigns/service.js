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
exports.updateCampaign = exports.getCampaignById = exports.getCampaigns = exports.createCampaign = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const createCampaign = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.campaign.create({
        data,
    });
});
exports.createCampaign = createCampaign;
const getCampaigns = (clientId, month) => __awaiter(void 0, void 0, void 0, function* () {
    const where = {};
    if (clientId) {
        where.client_id = clientId;
    }
    if (month) {
        const date = new Date(month);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        where.start_date = { gte: start };
        where.end_date = { lte: end };
    }
    return yield prisma_1.default.campaign.findMany({
        where,
        orderBy: { start_date: 'desc' },
        include: {
            client: { select: { name: true } },
            _count: { select: { tasks: true } }
        }
    });
});
exports.getCampaigns = getCampaigns;
const getCampaignById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.campaign.findUnique({
        where: { id },
        include: {
            tasks: {
                include: {
                    assignee: { select: { full_name: true, avatar_url: true } },
                    _count: { select: { comments: true, assets: true } }
                },
                orderBy: { priority: 'desc' }
            }
        }
    });
});
exports.getCampaignById = getCampaignById;
const updateCampaign = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.campaign.update({
        where: { id },
        data,
    });
});
exports.updateCampaign = updateCampaign;
