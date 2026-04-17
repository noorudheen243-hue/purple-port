import { Router } from 'express';
import { protect, authorize } from '../auth/middleware';
import * as controller from './controller';
import * as reportsController from './reports.controller';
import * as leadsController from './leads.controller';
import * as trackingController from './tracking.controller';
import * as activityController from './activity.controller';
import { getMetaAccountStatus } from '../marketing-tasks/controller';

const router = Router();

router.use(protect);

// Activity Logs (Unified Feed for My Task / Task Board)
router.get('/activity-logs', activityController.getActivityLogs);
router.get('/activity-logs/detail/:type/:id', activityController.getActivityLogDetail);
router.delete('/activity-logs/all', authorize('ADMIN', 'DEVELOPER_ADMIN'), activityController.deleteAllActivityLogs);
router.delete('/activity-logs/selected', authorize('ADMIN', 'DEVELOPER_ADMIN'), activityController.deleteSelectedActivityLogs);

// Admin/Manager/Exec: Configure Services
router.patch('/services/:clientId', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE'), controller.updateServices);
router.get('/services/:clientId', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE'), controller.getServices);

// Client/Admin/Manager: Get Dashboard Data
router.get('/global-stats', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'DEVELOPER_ADMIN'), controller.getGlobalPortalStats);
router.get('/dashboard', controller.getPortalDashboard);

// Approvals
router.get('/approvals', controller.getPendingApprovals);
router.patch('/approvals/:id', controller.updateApprovalStatus);

// ... existing imports ...

// ... existing imports ...

// Reports
router.get('/reports', reportsController.getReports);
router.post('/reports/generate', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE'), reportsController.generateReport);

// Service Tracking Logs (Manual Data Entry)
router.get('/tracking/meta-ads/status', getMetaAccountStatus);
router.get('/tracking/meta-ads/campaigns', trackingController.getIntegratedCampaigns); // NEW: Fetch integrated Meta campaigns
router.get('/tracking/meta-ads', trackingController.getMetaAdsLogs);
router.post('/tracking/meta-ads', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createMetaAdsLog);
router.patch('/tracking/meta-ads/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.updateMetaAdsLog);
router.delete('/tracking/meta-ads/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.deleteMetaAdsLog);

router.get('/tracking/google-ads', trackingController.getGoogleAdsLogs);
router.post('/tracking/google-ads', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createGoogleAdsLog);
router.patch('/tracking/google-ads/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.updateGoogleAdsLog);
router.delete('/tracking/google-ads/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.deleteGoogleAdsLog);

router.get('/tracking/seo', trackingController.getSeoLogs);
router.post('/tracking/seo', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createSeoLog);
router.patch('/tracking/seo/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.updateSeoLog);
router.delete('/tracking/seo/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.deleteSeoLog);

router.get('/tracking/web-dev', trackingController.getWebProjects);
router.post('/tracking/web-dev', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createWebProject);
router.patch('/tracking/web-dev/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.updateWebProject);
router.delete('/tracking/web-dev/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.deleteWebProject);

router.get('/tracking/content', trackingController.getContentDeliverables);
router.post('/tracking/content', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createContentDeliverable);
router.patch('/tracking/content/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'CLIENT'), trackingController.updateContentDeliverable);
router.delete('/tracking/content/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.deleteContentDeliverable);

// Marketing Groups
router.get('/tracking/groups', trackingController.getMarketingGroups);
router.post('/tracking/groups', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE'), trackingController.createMarketingGroup);

// Lead Management
router.get('/tracking/leads', leadsController.getLeads);
router.post('/tracking/leads', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'DEVELOPER_ADMIN', 'CLIENT'), leadsController.createLead);
router.patch('/tracking/leads/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'DEVELOPER_ADMIN', 'CLIENT'), leadsController.updateLead);
router.delete('/tracking/leads/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'DEVELOPER_ADMIN'), leadsController.deleteLead);

export default router;
