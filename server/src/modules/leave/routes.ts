import express from 'express';
import { LeaveController } from './controller';
import { protect as authenticate, authorize } from '../../modules/auth/middleware';

const router = express.Router();

router.post('/apply', authenticate, LeaveController.applyLeave);
router.get('/my-leaves', authenticate, LeaveController.getMyLeaves);

// Admin Routes
router.get('/requests', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), LeaveController.getAllRequests);
router.patch('/:id/status', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), LeaveController.updateStatus);
router.get('/history', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), LeaveController.getHistory);
router.post('/:id/revert', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), LeaveController.revertLeave);
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), LeaveController.deleteLeave);

export default router;
