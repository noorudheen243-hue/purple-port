import express from 'express';
import { getMyNotifications, markAsRead, markAllRead } from './controller';
import { protect } from '../auth/middleware';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllRead);

export default router;
