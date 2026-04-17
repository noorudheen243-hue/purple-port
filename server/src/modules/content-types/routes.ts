import { Router } from 'express';
import * as controller from './controller';
import { protect } from '../auth/middleware';

const router = Router();

router.use(protect);

router.get('/', controller.getTypes);
router.post('/', controller.createType);

export default router;
