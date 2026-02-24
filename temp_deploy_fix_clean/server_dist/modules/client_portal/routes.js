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
const middleware_1 = require("../auth/middleware");
const controller = __importStar(require("./controller"));
const reportsController = __importStar(require("./reports.controller"));
const leadsController = __importStar(require("./leads.controller"));
const trackingController = __importStar(require("./tracking.controller"));
const router = (0, express_1.Router)();
router.use(middleware_1.protect);
// Admin/Manager/Exec: Configure Services
router.patch('/services/:clientId', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE'), controller.updateServices);
router.get('/services/:clientId', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE'), controller.getServices);
// Client/Admin/Manager: Get Dashboard Data
router.get('/global-stats', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'DEVELOPER_ADMIN'), controller.getGlobalPortalStats);
router.get('/dashboard', controller.getPortalDashboard);
// Approvals
router.get('/approvals', controller.getPendingApprovals);
router.patch('/approvals/:id', controller.updateApprovalStatus);
// ... existing imports ...
// ... existing imports ...
// Reports
router.get('/reports', reportsController.getReports);
router.post('/reports/generate', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE'), reportsController.generateReport);
// Service Tracking Logs (Manual Data Entry)
router.get('/tracking/meta-ads', trackingController.getMetaAdsLogs);
router.post('/tracking/meta-ads', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createMetaAdsLog);
router.patch('/tracking/meta-ads/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.updateMetaAdsLog);
router.delete('/tracking/meta-ads/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.deleteMetaAdsLog);
router.get('/tracking/google-ads', trackingController.getGoogleAdsLogs);
router.post('/tracking/google-ads', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createGoogleAdsLog);
router.patch('/tracking/google-ads/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.updateGoogleAdsLog);
router.delete('/tracking/google-ads/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.deleteGoogleAdsLog);
router.get('/tracking/seo', trackingController.getSeoLogs);
router.post('/tracking/seo', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createSeoLog);
router.patch('/tracking/seo/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.updateSeoLog);
router.delete('/tracking/seo/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.deleteSeoLog);
router.get('/tracking/web-dev', trackingController.getWebProjects);
router.post('/tracking/web-dev', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createWebProject);
router.patch('/tracking/web-dev/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.updateWebProject);
router.get('/tracking/content', trackingController.getContentDeliverables);
router.post('/tracking/content', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createContentDeliverable);
router.patch('/tracking/content/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'CLIENT'), trackingController.updateContentDeliverable);
router.delete('/tracking/content/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.deleteContentDeliverable);
// Lead Management
router.get('/tracking/leads', leadsController.getLeads);
router.post('/tracking/leads', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'DEVELOPER_ADMIN', 'CLIENT'), leadsController.createLead);
router.patch('/tracking/leads/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'DEVELOPER_ADMIN', 'CLIENT'), leadsController.updateLead);
router.delete('/tracking/leads/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'DEVELOPER_ADMIN'), leadsController.deleteLead);
exports.default = router;
