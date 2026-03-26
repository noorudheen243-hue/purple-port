import { Router } from 'express';
import { getSettings, updateSetting, batchUpdateSettings } from './controller';
// import { authorize } from '../../middleware/auth'; // Assuming there is an authorize middleware

const router = Router();

// In a real app, we'd add authentication/authorization middleware here
// e.g., router.use(authorize(['ADMIN', 'DEVELOPER_ADMIN']));

router.get('/', getSettings);
router.post('/', updateSetting);
router.post('/batch', batchUpdateSettings);

export default router;
