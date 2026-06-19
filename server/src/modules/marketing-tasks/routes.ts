import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    manualSync, getMetrics, authMeta, metaCallback, authGoogle, googleCallback,
    getAvailableAccounts, getIntegrationStatus, selectAccount, disconnectAccount,
    middleware, getLeads, syncLeads, createLead, updateLead, deleteLead, updateLeadFeedback, addFollowUp, updateFollowUp, deleteFollowUp,
    getMetaProfiles, linkAccountToProfile, getAiTips, getMetaCampaignsDetailed, getMetaAdSets, getMetaAds, createMetaCampaign, createMetaAdSet, updateMetaStatus, sendReport,
    syncCampaign, getMetaAccountStatus
} from './controller';
import { 
    getGroups, 
    createGroup, 
    updateGroup, 
    deleteGroup, 
    assignCampaignsToGroup,
    unassignCampaignFromGroup
} from './marketingGroup.controller';
import { protect } from '../auth/middleware';
import * as crmController from './crm.controller';
import {
    verifyMetaLeadsWebhook,
    handleMetaLeadsWebhook
} from './crm.controller';

// Ensure temp upload dir exists
const uploadDir = path.join(process.cwd(), 'uploads', 'reports');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const reportUpload = multer({ dest: uploadDir });


const router = Router();

// Apply feature flag middleware to all routes in this module
// Removed undefined middleware spread; apply specific middleware as needed

// OAuth Endpoints (GET) - MUST NOT BE PROTECTED
router.get('/auth/meta', authMeta);
router.get('/auth/meta/callback', metaCallback);
router.get('/auth/google', authGoogle);
router.get('/auth/google/callback', googleCallback);

// Incoming CRM webhook for landing pages (public endpoint)
router.post('/crm/webhooks/incoming', crmController.handleIncomingWebhookLead);

// Meta Lead Ads Webhook — public endpoints (no auth required)
// GET: Meta calls this to verify the webhook URL when you subscribe in App Dashboard
// POST: Meta sends real-time lead notifications here
router.get('/crm/webhooks/meta-leads', verifyMetaLeadsWebhook);
router.post('/crm/webhooks/meta-leads', handleMetaLeadsWebhook);

// Apply protection to all subsequent data routes
router.use(protect);

// Manual sync endpoints (POST)
router.post('/sync', manualSync);
router.post('/sync/campaign', syncCampaign);

// Status endpoints
router.get('/meta/status', getMetaAccountStatus);

// Get metrics endpoint (GET)
router.get('/metrics', getMetrics);
router.get('/ai-tips', getAiTips);

// Grouping Endpoints
router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.put('/groups/:id', updateGroup);
router.delete('/groups/:id', deleteGroup);
router.post('/groups/assign', assignCampaignsToGroup);
router.post('/groups/unassign', unassignCampaignFromGroup);

// Leads endpoints
router.get('/leads', getLeads);
router.post('/leads', createLead);
router.patch('/leads/:id', updateLead);
router.patch('/leads/:id/feedback', updateLeadFeedback);
router.delete('/leads/:id', deleteLead);
router.post('/leads/sync', syncLeads);
router.post('/leads/follow-up', addFollowUp);
router.patch('/leads/follow-up/:id', updateFollowUp);
router.delete('/leads/follow-up/:id', deleteFollowUp);

// CRM Endpoints
router.get('/crm/dashboard-stats', crmController.getCrmDashboardStats);
router.get('/crm/leads', crmController.getLeads);
router.post('/crm/leads', crmController.createManualLead);
router.post('/crm/leads/sync-meta', crmController.syncMetaLeadsToCrm);
router.post('/crm/leads/subscribe-all-webhooks', crmController.subscribeAllPagesToWebhook);
router.post('/crm/leads/sync-meta-all', crmController.syncAllMetaLeadsToCrm);
router.post('/crm/leads/bulk-assign', crmController.bulkAssignLeads);
router.post('/crm/leads/bulk-update', crmController.bulkUpdateStatus);
router.post('/crm/leads/bulk-delete', crmController.bulkDeleteLeads);
router.post('/crm/leads/merge', crmController.mergeLeads);
router.post('/crm/leads/import', crmController.importCsvLeads);
router.patch('/crm/leads/:id', crmController.updateLeadDetails);
router.post('/crm/leads/:id/notes', crmController.addLeadNote);
router.get('/crm/leads/:id/history', crmController.getLeadActivities);
router.get('/crm/follow-ups', crmController.getFollowUps);
router.patch('/crm/follow-ups/:id', crmController.updateFollowUpStatus);
router.get('/crm/campaign-performance', crmController.getCampaignCRMPerformance);

// Account Discovery & Selection (NEW)
router.get('/status', getIntegrationStatus);
router.get('/accounts', getAvailableAccounts);
router.post('/accounts/select', selectAccount);
router.post('/accounts/disconnect', disconnectAccount);

// Meta Profile Management (NEW)
router.get('/meta/profiles', getMetaProfiles);
router.post('/meta/link-profile', linkAccountToProfile);
router.get('/meta/accounts', getAvailableAccounts);

// Meta Ads Manager Operations (NEW)
router.get('/meta/manager/campaigns', getMetaCampaignsDetailed);
router.get('/meta/manager/adsets', getMetaAdSets);
router.get('/meta/manager/ads', getMetaAds);

router.post('/meta/manager/campaigns', createMetaCampaign);
router.post('/meta/manager/adsets', createMetaAdSet);
router.patch('/meta/manager/status', updateMetaStatus);

// Report Generation & WhatsApp Dispatch
router.post('/report/send', reportUpload.single('pdf'), sendReport);

export default router;
