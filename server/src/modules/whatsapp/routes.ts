import { Router } from 'express';
import { getStatus, requestInitialization, logout } from './controller';
import { protect, authorize } from '../auth/middleware';

const router = Router();

// Only Admins or authorized roles should control the WhatsApp engine
router.use(protect);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/status', getStatus);
router.post('/init', requestInitialization);
router.post('/logout', logout);

export default router;
