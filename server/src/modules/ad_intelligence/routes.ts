import { Router } from 'express';
import { protect, authorize } from '../auth/middleware';
import * as controller from './controller';

const router = Router();

router.use(protect);

// Trigger manual sync (Admin/Manager)
router.post('/sync', authorize('ADMIN', 'MANAGER'), controller.triggerSync);

// Get linked accounts for a client
router.get('/accounts/:clientId', controller.getLinkedAccounts);

// Get Performance Stats
router.get('/stats', controller.getStats);

export default router;
