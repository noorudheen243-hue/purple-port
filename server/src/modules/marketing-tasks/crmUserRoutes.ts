import { Router } from 'express';
import { protect } from '../auth/middleware';
import { protectCrmUser } from '../auth/crmMiddleware';
import { loginCrmUser, getCrmMe, logoutCrmUser } from '../auth/crmAuthController';
import { getCrmUsers, createCrmUser, updateCrmUser, deleteCrmUser } from './crmUserController';
import {
    getCrmDashboardStats,
    getLeads,
    createManualLead,
    updateLeadDetails,
    addLeadNote,
    getLeadActivities,
    getFollowUps,
    updateFollowUpStatus,
    getCampaignCRMPerformance,
    syncMetaLeadsToCrm,
    getMetaConnectionStatus
} from './crm.controller';

const router = Router();

// ==========================================
// 1. CRM USER AUTHENTICATION (PUBLIC / CRM PROTECTED)
// ==========================================
router.post('/auth/login', loginCrmUser);
router.get('/auth/me', protectCrmUser, getCrmMe);
router.post('/auth/logout', protectCrmUser, logoutCrmUser);

// ==========================================
// 2. CRM USER CRUD MANAGEMENT (APP STAFF ONLY - Admin, Manager, Client)
// ==========================================
router.get('/users', protect, getCrmUsers);
router.post('/users', protect, createCrmUser);
router.put('/users/:id', protect, updateCrmUser);
router.delete('/users/:id', protect, deleteCrmUser);

// ==========================================
// 3. CRM EXTERNAL USER DATA ENDPOINTS (CRM USER ONLY)
// ==========================================
router.get('/external/dashboard-stats', protectCrmUser, getCrmDashboardStats);
router.get('/external/leads', protectCrmUser, getLeads);
router.post('/external/leads', protectCrmUser, createManualLead);
router.put('/external/leads/:id', protectCrmUser, updateLeadDetails);
router.post('/external/leads/:id/notes', protectCrmUser, addLeadNote);
router.get('/external/leads/:id/history', protectCrmUser, getLeadActivities);
router.get('/external/follow-ups', protectCrmUser, getFollowUps);
router.put('/external/follow-ups/:id', protectCrmUser, updateFollowUpStatus);
router.get('/external/campaign-performance', protectCrmUser, getCampaignCRMPerformance);
router.post('/external/sync-meta', protectCrmUser, syncMetaLeadsToCrm);
router.get('/external/meta-status', protectCrmUser, getMetaConnectionStatus);

// ==========================================
// 4. CRM META ADS MANAGER (FULL CONTROL)
// ==========================================
// Moved to main app routes to prevent CRM user access

export default router;
