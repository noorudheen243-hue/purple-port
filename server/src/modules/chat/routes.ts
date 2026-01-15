import { Router } from 'express';
import * as controller from './controller';
import { protect } from '../auth/middleware';

const router = Router();

router.use(protect); // Protect all chat routes

router.get('/conversations', controller.getConversations);
router.post('/conversations', controller.createConversation);
router.get('/conversations/:conversationId/messages', controller.getMessages);
router.post('/messages', controller.sendMessage);

export default router;
