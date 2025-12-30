import express from 'express';
import { registerUser, loginUser, logoutUser, getMe } from './controller';
import { protect } from './middleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);

export default router;
