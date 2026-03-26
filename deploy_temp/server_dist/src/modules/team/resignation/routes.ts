import { Router } from 'express';
import { protect, authorize } from '../../auth/middleware';
import { ROLES } from '../../auth/roles';
import * as controller from './controller';

const router = Router();

// Employee Routes
router.post('/apply', protect, controller.applyResignation);
router.get('/my', protect, controller.getMyResignation);

// Manager/Admin Routes
router.get('/', protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), controller.listResignations); // List all

// Actions
router.patch('/:id/approve', protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), controller.approveResignation);
router.patch('/:id/reject', protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), controller.rejectResignation); // Body: reason
router.patch('/:id/revise', protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), controller.reviseNoticePeriod); // Body: days, reason
router.patch('/:id/complete', protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), controller.completeResignation);
router.patch('/:id', protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), controller.updateResignation);
router.delete('/:id', protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), controller.deleteResignation);

export default router;
