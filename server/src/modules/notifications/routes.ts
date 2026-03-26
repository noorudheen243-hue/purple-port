import express from 'express';
import { 
    getMyNotifications, markAsRead, markAllRead, getPreferences, 
    updatePreferences, getAILogs, resolveAILog, getAIRules, batchUpdateAIRules,
    sendTestWhatsApp
} from './controller';
import { protect, authorize } from '../auth/middleware';
import { ROLES } from '../auth/roles';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllRead);

// AI & Preferences
router.get('/preferences', getPreferences);
router.post('/preferences', updatePreferences);
router.get('/ai-logs', getAILogs);
router.put('/ai-logs/:id/resolve', resolveAILog);

// AI Admin Rules 
router.get('/rules', authorize(ROLES.ADMIN, ROLES.DEVELOPER_ADMIN), getAIRules);
router.post('/rules/batch', authorize(ROLES.ADMIN, ROLES.DEVELOPER_ADMIN), batchUpdateAIRules);
router.post('/wa-test', authorize(ROLES.ADMIN, ROLES.DEVELOPER_ADMIN), sendTestWhatsApp); // Added WA Trial/Test

export default router;
