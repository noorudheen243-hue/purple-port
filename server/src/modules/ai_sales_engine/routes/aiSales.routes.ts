import express from 'express';
import { 
    getDeals, createDeal, updateDeal, getDealById, 
    calculateLeadScore, getDashboardStats, runFullAnalytics 
} from '../controllers/aiSales.controller';
import { protect, authorize } from '../../auth/middleware';

const router = express.Router();

// Initially restricted to DEVELOPER_ADMIN as per requirement
router.use(protect);
router.use(authorize('DEVELOPER_ADMIN'));

// Deals / Pipeline
router.get('/deals', getDeals);
router.post('/deals', createDeal);
router.get('/deals/:id', getDealById);
router.patch('/deals/:id', updateDeal);

// Lead Scoring
router.post('/leads/:leadId/score', calculateLeadScore);

// Dashboard & Analytics
router.get('/dashboard-stats', getDashboardStats);
router.post('/run-analytics', runFullAnalytics);

export default router;
