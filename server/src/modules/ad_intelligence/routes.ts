import { Router } from 'express';
import { protect, authorize } from '../auth/middleware';
import * as controller from './controller';

const router = Router();

router.use(protect);

// Trigger manual sync (Admin/Manager)
router.post('/sync', authorize('ADMIN', 'MANAGER'), controller.triggerSync);

// Meta OAuth
router.get('/meta-auth', controller.getMetaAuthUrl);
router.post('/meta-callback', controller.handleMetaCallback);

// Meta Account Management
router.get('/remote-accounts', authorize('ADMIN', 'MANAGER'), controller.listRemoteAdAccounts);
router.post('/link-account', authorize('ADMIN', 'MANAGER'), controller.linkAdAccount);
router.post('/sync-account/:accountId', authorize('ADMIN', 'MANAGER'), controller.syncAdAccount);

// Campaign Data
router.get('/campaigns/:adAccountId', authorize('ADMIN', 'MANAGER'), controller.getCampaigns);

// Get linked accounts for a client
router.get('/accounts/:clientId', controller.getLinkedAccounts);

// Get Performance Stats
router.get('/stats', controller.getStats);

export default router;
