import express from 'express';
import { createCampaign, getCampaigns, getCampaignById, updateCampaign } from './controller';
import { protect, authorize } from '../auth/middleware';

const router = express.Router();

router.use(protect);

router.get('/', getCampaigns);
router.get('/:id', getCampaignById);

router.post('/', authorize('ADMIN', 'MANAGER', 'MARKETING_EXEC'), createCampaign);
router.patch('/:id', authorize('ADMIN', 'MANAGER', 'MARKETING_EXEC'), updateCampaign);

export default router;
