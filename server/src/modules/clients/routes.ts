import express from 'express';
import { createClient, getClients, getClientById, updateClient, deleteClient, generateCredentials, listCredentials, updateCredentials, getNextCode } from './controller';
import { protect, authorize } from '../auth/middleware';

const router = express.Router();

router.use(protect); // All client routes require login

// Client Credentials Management
router.post('/credentials/generate', authorize('ADMIN'), generateCredentials);
router.get('/credentials', authorize('ADMIN'), listCredentials);
router.put('/credentials/:id', authorize('ADMIN'), updateCredentials);

router.get('/', getClients);
router.get('/next-code', getNextCode);
router.get('/:id', getClientById);

// Only Admin, Managers, and Executives can modify clients
// Allow all internal staff to manage clients
router.post('/', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'MARKETING_EXEC'), createClient);
router.patch('/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'MARKETING_EXEC'), updateClient);
router.delete('/:id', authorize('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'MARKETING_EXEC'), deleteClient);

export default router;
