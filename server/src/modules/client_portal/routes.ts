import { Router } from 'express';
import { protect, authorize } from '../auth/middleware';
import * as controller from './controller';
import * as reportsController from './reports.controller';

const router = Router();

router.use(protect);

// Admin/Manager/Exec: Configure Services
router.patch('/services/:clientId', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE'), controller.updateServices);
router.get('/services/:clientId', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE'), controller.getServices);

// Client/Admin/Manager: Get Dashboard Data
router.get('/global-stats', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'DEVELOPER_ADMIN'), controller.getGlobalPortalStats);
router.get('/dashboard', controller.getPortalDashboard);

// Approvals
router.get('/approvals', controller.getPendingApprovals);
router.patch('/approvals/:id', controller.updateApprovalStatus);

import * as trackingController from './tracking.controller';

// ... existing imports ...

// Reports
router.get('/reports', reportsController.getReports);
router.post('/reports/generate', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE'), reportsController.generateReport);

// Service Tracking Logs (Manual Data Entry)
router.get('/tracking/meta-ads', trackingController.getMetaAdsLogs);
router.post('/tracking/meta-ads', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createMetaAdsLog);
router.patch('/tracking/meta-ads/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.updateMetaAdsLog);
router.delete('/tracking/meta-ads/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.deleteMetaAdsLog);

router.get('/tracking/google-ads', trackingController.getGoogleAdsLogs);
router.post('/tracking/google-ads', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createGoogleAdsLog);

router.get('/tracking/seo', trackingController.getSeoLogs);
router.post('/tracking/seo', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createSeoLog);

router.get('/tracking/web-dev', trackingController.getWebProjects);
router.post('/tracking/web-dev', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createWebProject);
router.patch('/tracking/web-dev/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.updateWebProject);

router.get('/tracking/content', trackingController.getContentDeliverables);
router.post('/tracking/content', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.createContentDeliverable);
router.patch('/tracking/content/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'CLIENT'), trackingController.updateContentDeliverable);
router.delete('/tracking/content/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'MARKETING_EXEC', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), trackingController.deleteContentDeliverable);

export default router;
