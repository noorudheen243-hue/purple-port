import { Router } from 'express';
import { protect, authorize } from '../../modules/auth/middleware';
import { ROLES } from '../../modules/auth/roles';
import * as userController from './controller';

const router = Router();

router.get('/', protect, userController.getUsers);
router.get('/:id', protect, userController.getUserById); // Self or Admin check should be in controller
router.patch('/:id', protect, authorize(ROLES.ADMIN, ROLES.MANAGER), userController.updateUser);

export default router;
