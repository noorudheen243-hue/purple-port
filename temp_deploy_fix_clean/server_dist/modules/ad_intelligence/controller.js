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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = exports.getCampaigns = exports.syncAdAccount = exports.linkAdAccount = exports.listRemoteAdAccounts = exports.handleMetaCallback = exports.getMetaAuthUrl = exports.getLinkedAccounts = exports.triggerSync = void 0;
const ingestionWorker = __importStar(require("./workers/ingest"));
const ingestionService = __importStar(require("./service"));
const metaService = __importStar(require("./meta.service"));
const prisma_1 = __importDefault(require("../../utils/prisma"));
const triggerSync = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield ingestionWorker.runIngestionJob();
        res.json({ message: 'Sync complete', result });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.triggerSync = triggerSync;
const getLinkedAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clientId } = req.params;
        const accounts = yield ingestionService.getLinkedAdAccounts(clientId);
        res.json(accounts);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getLinkedAccounts = getLinkedAccounts;
// --- META INTEGRATION ---
const getMetaAuthUrl = (req, res) => {
    // Generate URL for user to click
    const { redirectUri } = req.query;
    const url = metaService.getAuthUrl(redirectUri, process.env.META_APP_ID || '', 'some_random_state');
    res.json({ url });
};
exports.getMetaAuthUrl = getMetaAuthUrl;
const handleMetaCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, redirectUri } = req.body;
        // Exchange code
        const tokenData = yield metaService.exchangeCodeForToken(code, redirectUri);
        // Save to User
        yield metaService.storeUserToken(req.user.id, tokenData);
        res.json({ message: "Meta Connected Successfully", user_id: req.user.id });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.handleMetaCallback = handleMetaCallback;
const listRemoteAdAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get User's Token
        const token = yield prisma_1.default.metaToken.findUnique({ where: { user_id: req.user.id } });
        if (!token)
            return res.status(404).json({ message: "No Meta Account Connected" });
        const accounts = yield metaService.fetchAdAccounts(token.access_token);
        res.json(accounts);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.listRemoteAdAccounts = listRemoteAdAccounts;
const linkAdAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clientId, name, externalId, platform } = req.body; // platform="META"
        const account = yield prisma_1.default.adAccount.create({
            data: {
                client_id: clientId,
                name: name,
                external_id: externalId, // e.g. act_123 -> external_id
                platform: platform,
                status: 'ACTIVE'
            }
        });
        // If immediate sync desired:
        // const token = ... get user token
        // await metaService.syncCampaignsForAccount(account.id, externalId, token.access_token);
        res.json(account);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.linkAdAccount = linkAdAccount;
const syncAdAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { accountId } = req.params;
        const account = yield prisma_1.default.adAccount.findUnique({ where: { id: accountId } });
        if (!account)
            return res.status(404).json({ message: "Account not found" });
        // Security: Does this user have access? 
        // Admin or Manager.
        // Use Linked User Token (Assumption: User who connected is the one triggering or we use system generic?)
        // Complex part: AdAccount is linked to Client. MetaToken is linked to User.
        // If I (Admin) click Sync, I use MY token. If I don't have access to that ad account, it fails.
        // OR we store `meta_token_id` on AdAccount? Model didn't do that yet.
        // Fallback: Try req.user's token.
        const token = yield prisma_1.default.metaToken.findUnique({ where: { user_id: req.user.id } });
        if (!token)
            return res.status(403).json({ message: "Please connect your Meta Account first." });
        const result = yield metaService.syncCampaignsForAccount(account.id, account.external_id, token.access_token);
        res.json({ synced: result });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.syncAdAccount = syncAdAccount;
const getCampaigns = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Return DB Campaigns
    try {
        const { adAccountId } = req.params;
        const campaigns = yield prisma_1.default.adCampaign.findMany({
            where: { ad_account_id: adAccountId },
            include: { insights: true }, // Include latest insight?
            orderBy: { createdAt: 'desc' }
        });
        res.json(campaigns);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getCampaigns = getCampaigns;
// --- EXISTING ---
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Default to last 30 days if not specified
        const start = req.query.start ? new Date(req.query.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = req.query.end ? new Date(req.query.end) : new Date();
        const clientId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'CLIENT' ? req.user.linked_client_id : undefined;
        const stats = yield ingestionService.getAggregatedStats(start, end, clientId);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getStats = getStats;
