import express from 'express';
import { createComment, getComments } from './controller';
import { protect } from '../auth/middleware';

const router = express.Router();

router.use(protect);

router.post('/', createComment);
router.get('/', getComments);

export default router;
