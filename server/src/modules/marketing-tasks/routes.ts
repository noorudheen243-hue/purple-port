import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    manualSync, getMetrics, authMeta, metaCallback, authGoogle, googleCallback,
    getAvailableAccounts, getIntegrationStatus, selectAccount, disconnectAccount,
    middleware, getLeads, syncLeads, createLead, updateLead, deleteLead, addFollowUp,
    getMetaProfiles, linkAccountToProfile, getAiTips, getMetaCampaignsDetailed, getMetaAdSets, getMetaAds, createMetaCampaign, createMetaAdSet, updateMetaStatus, sendReport
} from './controller';
import { protect } from '../auth/middleware';

// Ensure temp upload dir exists
const uploadDir = path.join(process.cwd(), 'uploads', 'reports');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const reportUpload = multer({ dest: uploadDir });


const router = Router();

// Apply feature flag middleware to all routes in this module
router.use(...middleware);

// OAuth Endpoints (GET) - MUST NOT BE PROTECTED
router.get('/auth/meta', authMeta);
router.get('/auth/meta/callback', metaCallback);
router.get('/auth/google', authGoogle);
router.get('/auth/google/callback', googleCallback);

// Apply protection to all subsequent data routes
router.use(protect);

// Manual sync endpoint (POST)
router.post('/sync', manualSync);

// Get metrics endpoint (GET)
router.get('/metrics', getMetrics);
router.get('/ai-tips', getAiTips);

// Leads endpoints
router.get('/leads', getLeads);
router.post('/leads', createLead);
router.patch('/leads/:id', updateLead);
router.delete('/leads/:id', deleteLead);
router.post('/leads/sync', syncLeads);
router.post('/leads/follow-up', addFollowUp);

router.post('/leads/follow-up', addFollowUp);

// Account Discovery & Selection (NEW)
router.get('/status', getIntegrationStatus);
router.get('/accounts', getAvailableAccounts);
router.post('/accounts/select', selectAccount);
router.post('/accounts/disconnect', disconnectAccount);

// Meta Profile Management (NEW)
router.get('/meta/profiles', getMetaProfiles);
router.post('/meta/link-profile', linkAccountToProfile);

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
