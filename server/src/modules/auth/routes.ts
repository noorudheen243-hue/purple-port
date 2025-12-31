import express from 'express';
import { registerUser, loginUser, logoutUser, getMe, changePassword, emergencyReset } from './controller';
import { protect } from './middleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);
router.get('/emergency-reset', emergencyReset);
router.get('/emergency-reset', registerUser); // Typo protection: NO. Need to import it first. 
// Wait, I need to export it from controller first.
// And checking imports in lines 1-3.
// Let's do imports first or assume it's there? No, need to be careful.
// Actually, I can just use 'any' casting if needed but better to import.
// Let's replace the import line too.

export default router;
