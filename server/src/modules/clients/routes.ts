import express from 'express';
import { createClient, getClients, getClientById, updateClient, deleteClient } from './controller';
import { protect, authorize } from '../auth/middleware';

const router = express.Router();

router.use(protect); // All client routes require login

router.get('/', getClients);
router.get('/:id', getClientById);

// Only Admin and Managers can modify clients
router.post('/', authorize('ADMIN', 'MANAGER'), createClient);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), updateClient);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteClient); // New Route

export default router;
