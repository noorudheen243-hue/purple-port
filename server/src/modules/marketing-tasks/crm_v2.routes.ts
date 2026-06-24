import { Router } from 'express';
import { protect } from '../auth/middleware';
import { protectCrmUser } from '../auth/crmMiddleware';
import {
    getV2DashboardStats,
    getV2Groups,
    createV2Group,
    getV2Leads,
    createV2Lead,
    updateV2Lead,
    addV2Followup,
    getV2CampaignPerformance
} from './crm_v2.controller';

const router = Router();

// Middleware to allow both Main App Users and CRM Users
// If protectCrmUser passes, req.crmUser is set. 
// We can use a custom middleware to allow either to pass.
const allowAnyCrmAccess = (req: any, res: any, next: any) => {
    // Try protect first
    protect(req, res, (err: any) => {
        if (!err && req.user) return next();
        // If protect fails, try protectCrmUser
        protectCrmUser(req, res, (err2: any) => {
            if (!err2 && req.crmUser) return next();
            res.status(401).json({ success: false, message: "Not authorized to access CRM V2 API" });
        });
    });
};

router.use(allowAnyCrmAccess);

router.get('/dashboard-stats', getV2DashboardStats);

router.get('/groups', getV2Groups);
router.post('/groups', createV2Group);

router.get('/leads', getV2Leads);
router.post('/leads', createV2Lead);
router.put('/leads/:id', updateV2Lead);
router.post('/leads/:id/followups', addV2Followup);

router.get('/campaign-performance', getV2CampaignPerformance);

export default router;
