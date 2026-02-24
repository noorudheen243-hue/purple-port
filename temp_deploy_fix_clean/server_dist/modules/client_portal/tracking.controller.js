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
exports.deleteContentDeliverable = exports.updateContentDeliverable = exports.createContentDeliverable = exports.getContentDeliverables = exports.updateWebProject = exports.createWebProject = exports.getWebProjects = exports.deleteSeoLog = exports.updateSeoLog = exports.createSeoLog = exports.getSeoLogs = exports.deleteGoogleAdsLog = exports.updateGoogleAdsLog = exports.createGoogleAdsLog = exports.getGoogleAdsLogs = exports.deleteMetaAdsLog = exports.updateMetaAdsLog = exports.createMetaAdsLog = exports.getMetaAdsLogs = void 0;
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
// --- META ADS ---
const getMetaAdsLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId)
            return res.status(403).json({ message: "Access Denied: Invalid Client Context" });
        const { startDate, endDate } = req.query;
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter = {
                date: Object.assign(Object.assign({}, (startDate && { gte: new Date(startDate) })), (endDate && { lte: new Date(endDate) }))
            };
        }
        const logs = yield prisma_1.default.metaAdsLog.findMany({
            where: Object.assign({ client_id: clientId }, dateFilter),
            orderBy: { date: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMetaAdsLogs = getMetaAdsLogs;
const createMetaAdsLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { client_id, campaign_name, objective, platform, spend, status, results_json, notes, date } = req.body;
        const log = yield prisma_1.default.metaAdsLog.create({
            data: {
                client_id,
                campaign_name,
                objective,
                platform,
                spend: parseFloat(spend || 0),
                results_json: typeof results_json === 'object' ? JSON.stringify(results_json) : results_json,
                notes,
                date: date ? new Date(date) : undefined
            }
        });
        res.json(log);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createMetaAdsLog = createMetaAdsLog;
const updateMetaAdsLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { campaign_name, objective, platform, spend, status, results_json, notes, date } = req.body;
        const log = yield prisma_1.default.metaAdsLog.update({
            where: { id },
            data: {
                campaign_name,
                objective,
                platform,
                spend: parseFloat(spend || 0),
                status: status || 'ACTIVE',
                results_json: typeof results_json === 'object' ? JSON.stringify(results_json) : results_json,
                notes,
                date: date ? new Date(date) : undefined
            }
        });
        res.json(log);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateMetaAdsLog = updateMetaAdsLog;
const deleteMetaAdsLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.metaAdsLog.delete({ where: { id } });
        res.json({ message: "Deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteMetaAdsLog = deleteMetaAdsLog;
// --- GOOGLE ADS ---
const getGoogleAdsLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId)
            return res.status(403).json({ message: "Access Denied: Invalid Client Context" });
        const { startDate, endDate } = req.query;
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter = {
                date: Object.assign(Object.assign({}, (startDate && { gte: new Date(startDate) })), (endDate && { lte: new Date(endDate) }))
            };
        }
        const logs = yield prisma_1.default.googleAdsLog.findMany({
            where: Object.assign({ client_id: clientId }, dateFilter),
            orderBy: { date: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getGoogleAdsLogs = getGoogleAdsLogs;
const createGoogleAdsLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { client_id, campaign_name, campaign_type, spend, status, clicks, impressions, conversions, cpa, notes, date } = req.body;
        const log = yield prisma_1.default.googleAdsLog.create({
            data: {
                client_id,
                campaign_name,
                campaign_type,
                spend: parseFloat(spend || 0),
                status: status || 'ACTIVE',
                clicks: parseInt(clicks || 0),
                impressions: parseInt(impressions || 0),
                conversions: parseInt(conversions || 0),
                cpa: parseFloat(cpa || 0),
                notes,
                date: date ? new Date(date) : undefined
            }
        });
        res.json(log);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createGoogleAdsLog = createGoogleAdsLog;
const updateGoogleAdsLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { campaign_name, campaign_type, spend, status, clicks, impressions, conversions, cpa, notes, date } = req.body;
        const log = yield prisma_1.default.googleAdsLog.update({
            where: { id },
            data: {
                campaign_name,
                campaign_type,
                spend: parseFloat(spend || 0),
                status: status || 'ACTIVE',
                clicks: parseInt(clicks || 0),
                impressions: parseInt(impressions || 0),
                conversions: parseInt(conversions || 0),
                cpa: parseFloat(cpa || 0),
                notes,
                date: date ? new Date(date) : undefined
            }
        });
        res.json(log);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateGoogleAdsLog = updateGoogleAdsLog;
const deleteGoogleAdsLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.googleAdsLog.delete({ where: { id } });
        res.json({ message: "Deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteGoogleAdsLog = deleteGoogleAdsLog;
// --- SEO ---
const getSeoLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId)
            return res.status(403).json({ message: "Access Denied: Invalid Client Context" });
        const { startDate, endDate } = req.query;
        let dateFilter = {};
        if (startDate || endDate) {
            // SEO logs use 'month' and 'year' instead of 'date'
            const sDate = startDate ? new Date(startDate) : null;
            const eDate = endDate ? new Date(endDate) : null;
            if (sDate && eDate) {
                dateFilter = {
                    OR: [
                        { year: { gt: sDate.getFullYear(), lt: eDate.getFullYear() } },
                        { year: sDate.getFullYear(), month: { gte: sDate.getMonth() + 1 } },
                        { year: eDate.getFullYear(), month: { lte: eDate.getMonth() + 1 } }
                    ]
                };
            }
            else if (sDate) {
                dateFilter = {
                    OR: [
                        { year: { gt: sDate.getFullYear() } },
                        { year: sDate.getFullYear(), month: { gte: sDate.getMonth() + 1 } }
                    ]
                };
            }
            else if (eDate) {
                dateFilter = {
                    OR: [
                        { year: { lt: eDate.getFullYear() } },
                        { year: eDate.getFullYear(), month: { lte: eDate.getMonth() + 1 } }
                    ]
                };
            }
        }
        const logs = yield prisma_1.default.seoLog.findMany({
            where: Object.assign({ client_id: clientId }, dateFilter),
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSeoLogs = getSeoLogs;
const createSeoLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { client_id, month, year, status, activities_json, keyword_rankings_json, organic_traffic, summary } = req.body;
        const log = yield prisma_1.default.seoLog.upsert({
            where: {
                client_id_month_year: {
                    client_id,
                    month: parseInt(month),
                    year: parseInt(year)
                }
            },
            update: {
                status: status || 'ACTIVE',
                activities_json: typeof activities_json === 'object' ? JSON.stringify(activities_json) : activities_json,
                keyword_rankings_json: typeof keyword_rankings_json === 'object' ? JSON.stringify(keyword_rankings_json) : keyword_rankings_json,
                organic_traffic: parseInt(organic_traffic || 0),
                summary
            },
            create: {
                client_id,
                month: parseInt(month),
                year: parseInt(year),
                status: status || 'ACTIVE',
                activities_json: typeof activities_json === 'object' ? JSON.stringify(activities_json) : activities_json,
                keyword_rankings_json: typeof keyword_rankings_json === 'object' ? JSON.stringify(keyword_rankings_json) : keyword_rankings_json,
                organic_traffic: parseInt(organic_traffic || 0),
                summary
            }
        });
        res.json(log);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createSeoLog = createSeoLog;
const updateSeoLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { month, year, status, activities_json, keyword_rankings_json, organic_traffic, summary } = req.body;
        const log = yield prisma_1.default.seoLog.update({
            where: { id },
            data: {
                month: parseInt(month),
                year: parseInt(year),
                status: status || 'ACTIVE',
                activities_json: typeof activities_json === 'object' ? JSON.stringify(activities_json) : activities_json,
                keyword_rankings_json: typeof keyword_rankings_json === 'object' ? JSON.stringify(keyword_rankings_json) : keyword_rankings_json,
                organic_traffic: parseInt(organic_traffic || 0),
                summary
            }
        });
        res.json(log);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateSeoLog = updateSeoLog;
const deleteSeoLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.seoLog.delete({ where: { id } });
        res.json({ message: "Deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteSeoLog = deleteSeoLog;
// --- WEB DEV ---
const getWebProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId)
            return res.status(403).json({ message: "Access Denied: Invalid Client Context" });
        const projects = yield prisma_1.default.webDevProject.findMany({
            where: { client_id: clientId },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(projects);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getWebProjects = getWebProjects;
const createWebProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { client_id, project_name, status, milestones_json, timeline_json, staging_url, live_url } = req.body;
        const project = yield prisma_1.default.webDevProject.create({
            data: {
                client_id,
                project_name,
                status,
                milestones_json: typeof milestones_json === 'object' ? JSON.stringify(milestones_json) : milestones_json,
                timeline_json: typeof timeline_json === 'object' ? JSON.stringify(timeline_json) : timeline_json,
                staging_url,
                live_url
            }
        });
        res.json(project);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createWebProject = createWebProject;
const updateWebProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const data = req.body;
        // Sanitize JSON fields if present
        if (data.milestones_json && typeof data.milestones_json === 'object') {
            data.milestones_json = JSON.stringify(data.milestones_json);
        }
        if (data.timeline_json && typeof data.timeline_json === 'object') {
            data.timeline_json = JSON.stringify(data.timeline_json);
        }
        const project = yield prisma_1.default.webDevProject.update({
            where: { id },
            data
        });
        res.json(project);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateWebProject = updateWebProject;
// ==========================================
// CONTENT & BRANDING
// ==========================================
const getContentDeliverables = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId)
            return res.status(403).json({ message: "Access Denied: Invalid Client Context" });
        const deliverables = yield prisma_1.default.contentDeliverable.findMany({
            where: { client_id: clientId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(deliverables);
    }
    catch (error) {
        console.error('Error fetching content deliverables:', error);
        res.status(500).json({ message: 'Failed to fetch deliverables' });
    }
});
exports.getContentDeliverables = getContentDeliverables;
const createContentDeliverable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { client_id, title, type, status, link, notes } = req.body;
        const deliverable = yield prisma_1.default.contentDeliverable.create({
            data: {
                client_id,
                title,
                type,
                status,
                file_url: link,
                feedback: notes
            }
        });
        res.status(201).json(deliverable);
    }
    catch (error) {
        console.error('Error creating deliverable:', error);
        res.status(500).json({ message: 'Failed to create deliverable' });
    }
});
exports.createContentDeliverable = createContentDeliverable;
const updateContentDeliverable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, link, notes, title } = req.body;
        const deliverable = yield prisma_1.default.contentDeliverable.update({
            where: { id },
            data: {
                status,
                file_url: link,
                feedback: notes,
                title
            }
        });
        res.json(deliverable);
    }
    catch (error) {
        console.error('Error updating deliverable:', error);
        res.status(500).json({ message: 'Failed to update deliverable' });
    }
});
exports.updateContentDeliverable = updateContentDeliverable;
const deleteContentDeliverable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.contentDeliverable.delete({ where: { id } });
        res.json({ message: 'Deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting deliverable:', error);
        res.status(500).json({ message: 'Failed to delete deliverable' });
    }
});
exports.deleteContentDeliverable = deleteContentDeliverable;
