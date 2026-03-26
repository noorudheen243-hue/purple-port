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
exports.runIngestionJob = void 0;
const service_1 = require("../service");
const prisma_1 = __importDefault(require("../../../utils/prisma"));
/**
 * MOCK WORKER
 * Simulates fetching data from Google/Meta APIs.
 * In production, this would use the actual SDKs.
 */
const runIngestionJob = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Starting Ad Ingestion Job...");
    // 1. Get all Active Campaigns with Ad Accounts
    const campaigns = yield prisma_1.default.campaign.findMany({
        where: { status: 'ACTIVE' }, // Only active campaigns
        // In real world, we'd filter by those having linked ad_accounts
    });
    const mockStats = campaigns.map(campaign => {
        // Generate random realistic stats
        const spend = Math.floor(Math.random() * 5000) * 1000000; // 0-5000 INR in micros
        return {
            date: new Date(new Date().setHours(0, 0, 0, 0)), // Today midnight
            spend_micros: BigInt(spend),
            impressions: Math.floor(Math.random() * 10000),
            clicks: Math.floor(Math.random() * 500),
            conversions: Math.floor(Math.random() * 20),
            campaign_id: campaign.id,
            ad_account_id: 'mock_account_id'
        };
    });
    console.log(`Fetched stats for ${mockStats.length} campaigns.`);
    const result = yield (0, service_1.ingestDailyStats)(mockStats);
    console.log(`Ingestion Complete. Processed: ${result.processed}`);
    return result;
});
exports.runIngestionJob = runIngestionJob;
