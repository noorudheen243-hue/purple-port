import { Router } from 'express';
import * as controller from './controller';
import { protect } from '../auth/middleware';

const router = Router();

// Developer Admin Guard
const requireDevAdmin = (req: any, res: any, next: any) => {
    const userRole = req.user?.role;
    const userEmail = req.user?.email || req.user?.id; // In case we need better lookup later

    // Based on user request, explicitly allow only Developer Admin
    // For safety since email isn't in token natively, we allow DEV_ADMIN role fallback.
    if (userRole === 'DEVELOPER_ADMIN' || userRole === 'DEV_ADMIN') {
        return next();
    }
    return res.status(403).json({ message: 'Forbidden: Developer Admin access only.' });
};

router.use(protect);
router.use(requireDevAdmin);

router.get('/campaigns', controller.getCampaigns);
router.post('/campaigns/sync', controller.syncCampaigns);
router.get('/insights', controller.getInsights);
router.get('/automations', controller.getAutomations);
router.get('/groups', controller.getGroups);

export default router;
