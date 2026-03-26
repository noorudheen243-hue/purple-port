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
exports.getGlobalPortalStats = exports.getPortalDashboard = exports.getServices = exports.updateServices = exports.updateApprovalStatus = exports.getPendingApprovals = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
// --- APPROVAL WORKFLOWS ---
const getPendingApprovals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        let clientId = user.linked_client_id;
        // Admin override
        if (req.query.clientId && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
            clientId = req.query.clientId;
        }
        if (!clientId)
            return res.status(400).json({ message: "Client Context Required" });
        // Logic:
        // Client: Only sees SUBMITTED items (waiting for their approval).
        // Admin: Sees DRAFT (to submit), SUBMITTED (to retract/edit), REJECTED (to fix).
        let statusFilter = { in: ['SUBMITTED'] }; // Default for Client
        if (user.role === 'ADMIN' || user.role === 'MANAGER') {
            // Admin sees everything active pending action or draft
            statusFilter = { in: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'] };
        }
        const pendingContent = yield prisma_1.default.contentDeliverable.findMany({
            where: {
                client_id: clientId,
                status: statusFilter
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ content: pendingContent });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPendingApprovals = getPendingApprovals;
const updateApprovalStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, feedback } = req.body;
        const user = req.user;
        // Valid Transitions
        // Client can: APPROVE, CHANGES_REQUESTED, REJECT (if SUBMITTED)
        // Admin can: SUBMIT (from DRAFT), REJECT, APPROVE (internal override)
        yield prisma_1.default.contentDeliverable.update({
            where: { id },
            data: {
                status,
                feedback,
                approver_id: user.id
            }
        });
        res.json({ message: 'Status updated' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateApprovalStatus = updateApprovalStatus;
// --- SERVICE CONFIGURATION ---
const updateServices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clientId } = req.params;
        const { services } = req.body; // e.g. ['META_ADS', 'SEO']
        const client = yield prisma_1.default.client.update({
            where: { id: clientId },
            data: {
                service_engagement: JSON.stringify(services)
            }
        });
        res.json({ message: 'Services updated', services: JSON.parse(client.service_engagement || '[]') });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateServices = updateServices;
const getServices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clientId } = req.params;
        const client = yield prisma_1.default.client.findUnique({ where: { id: clientId } });
        if (!client)
            return res.status(404).json({ message: "Client not found" });
        const services = client.service_engagement ? JSON.parse(client.service_engagement) : [];
        res.json({ services });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getServices = getServices;
// --- PORTAL DATA AGGREGATION ---
const getPortalDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Identify Client
        const user = req.user;
        let clientId = user.linked_client_id;
        if (req.query.clientId && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
            clientId = req.query.clientId;
        }
        if (!clientId)
            return res.status(400).json({ message: "Client Context Required" });
        // 2. Get Client Settings
        const client = yield prisma_1.default.client.findUnique({ where: { id: clientId } });
        if (!client)
            return res.status(404).json({ message: "Client not found" });
        const services = client.service_engagement ? JSON.parse(client.service_engagement) : [];
        // 3. Fetch Data per Service
        const dashboardData = { services };
        if (services.includes('META_ADS')) {
            // Get total spend and last campaign
            const metaAgg = yield prisma_1.default.metaAdsLog.aggregate({
                where: { client_id: clientId },
                _sum: { spend: true }
            });
            const lastMeta = yield prisma_1.default.metaAdsLog.findFirst({
                where: { client_id: clientId },
                orderBy: { date: 'desc' }
            });
            dashboardData.meta_ads = {
                total_spend: metaAgg._sum.spend || 0,
                last_campaign: (lastMeta === null || lastMeta === void 0 ? void 0 : lastMeta.campaign_name) || 'No Data'
            };
        }
        if (services.includes('GOOGLE_ADS')) {
            const googleAgg = yield prisma_1.default.googleAdsLog.aggregate({
                where: { client_id: clientId },
                _sum: { spend: true, conversions: true }
            });
            dashboardData.google_ads = {
                total_spend: googleAgg._sum.spend || 0,
                conversions: googleAgg._sum.conversions || 0
            };
        }
        if (services.includes('SEO')) {
            const lastSeo = yield prisma_1.default.seoLog.findFirst({
                where: { client_id: clientId },
                orderBy: [{ year: 'desc' }, { month: 'desc' }]
            });
            dashboardData.seo = {
                traffic: (lastSeo === null || lastSeo === void 0 ? void 0 : lastSeo.organic_traffic) || 0,
                month: lastSeo ? `${lastSeo.month}/${lastSeo.year}` : '-'
            };
        }
        if (services.includes('WEB_DEV')) {
            const activeProject = yield prisma_1.default.webDevProject.findFirst({
                where: { client_id: clientId, status: { not: 'DEPLOYED' } },
                orderBy: { updatedAt: 'desc' }
            });
            dashboardData.web_dev = {
                active_project: (activeProject === null || activeProject === void 0 ? void 0 : activeProject.project_name) || 'None',
                status: (activeProject === null || activeProject === void 0 ? void 0 : activeProject.status) || 'Idle'
            };
        }
        if (services.includes('CONTENT') || services.includes('BRANDING')) {
            const pendingParams = { in: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'] };
            const pendingCount = yield prisma_1.default.contentDeliverable.count({
                where: { client_id: clientId, status: pendingParams }
            });
            dashboardData.content = {
                pending_items: pendingCount
            };
        }
        res.json(dashboardData);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPortalDashboard = getPortalDashboard;
// --- GLOBAL PORTAL STATS (ADMIN DASHBOARD) ---
const getGlobalPortalStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [metaAgg, googleAgg, pendingContent, activeWebProjects, seoClients] = yield Promise.all([
            // 1. Meta Ads Total Spend
            prisma_1.default.metaAdsLog.aggregate({ _sum: { spend: true } }),
            // 2. Google Ads Total Spend
            prisma_1.default.googleAdsLog.aggregate({ _sum: { spend: true } }),
            // 3. Pending Content Items
            prisma_1.default.contentDeliverable.count({
                where: { status: { in: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'] } }
            }),
            // 4. Active Web Projects
            prisma_1.default.webDevProject.count({
                where: { status: { not: 'DEPLOYED' } }
            }),
            // 5. SEO Clients
            prisma_1.default.client.count({
                where: { service_engagement: { contains: 'SEO' } }
            })
        ]);
        res.json({
            meta_spend: metaAgg._sum.spend || 0,
            google_spend: googleAgg._sum.spend || 0,
            pending_content: pendingContent,
            active_web_projects: activeWebProjects,
            seo_clients: seoClients
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getGlobalPortalStats = getGlobalPortalStats;
