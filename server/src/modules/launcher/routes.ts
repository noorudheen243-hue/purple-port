import express from 'express';
import { protect } from '../auth/middleware';
import * as controller from './controller';

const router = express.Router();

router.use(protect);

router.get('/apps', controller.getApps);
router.post('/apps', controller.createApp);
router.put('/apps/:id/pin', controller.togglePin);
router.post('/apps/:id/use', controller.recordUsage);
router.delete('/apps/:id', controller.deleteApp); // Only user created
router.post('/exec', controller.executeLocal); // Admin/Localhost only

// Init defaults (dev utility)
router.post('/init-defaults', controller.initDefaults);

export default router;
