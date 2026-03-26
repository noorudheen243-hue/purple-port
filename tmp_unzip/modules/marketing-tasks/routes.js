"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const middleware_1 = require("../auth/middleware");
const router = (0, express_1.Router)();
// Apply feature flag middleware to all routes in this module
router.use(...controller_1.middleware);
// OAuth Endpoints (GET) - MUST NOT BE PROTECTED
router.get('/auth/meta', controller_1.authMeta);
router.get('/auth/meta/callback', controller_1.metaCallback);
router.get('/auth/google', controller_1.authGoogle);
router.get('/auth/google/callback', controller_1.googleCallback);
// Apply protection to all subsequent data routes
router.use(middleware_1.protect);
// Manual sync endpoint (POST)
router.post('/sync', controller_1.manualSync);
// Get metrics endpoint (GET)
router.get('/metrics', controller_1.getMetrics);
// Leads endpoints
router.get('/leads', controller_1.getLeads);
router.post('/leads', controller_1.createLead);
router.patch('/leads/:id', controller_1.updateLead);
router.delete('/leads/:id', controller_1.deleteLead);
router.post('/leads/sync', controller_1.syncLeads);
router.post('/leads/follow-up', controller_1.addFollowUp);
router.post('/leads/follow-up', controller_1.addFollowUp);
// Account Discovery & Selection (NEW)
router.get('/status', controller_1.getIntegrationStatus);
router.get('/accounts', controller_1.getAvailableAccounts);
router.post('/accounts/select', controller_1.selectAccount);
router.post('/accounts/disconnect', controller_1.disconnectAccount);
// Meta Profile Management (NEW)
router.get('/meta/profiles', controller_1.getMetaProfiles);
router.post('/meta/link-profile', controller_1.linkAccountToProfile);
exports.default = router;
