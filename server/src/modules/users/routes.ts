import { Router } from 'express';
import { protect } from '../../modules/auth/middleware';
import * as userController from './controller';

const router = Router();

router.get('/', protect, userController.getUsers);
router.get('/:id', protect, userController.getUserById);
router.patch('/:id', protect, userController.updateUser);

export default router;
