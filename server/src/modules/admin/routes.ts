import { Router } from 'express';
import { DatabaseRepairController } from './database.controller';
import { protect as authenticate, authorize } from '../auth/middleware';

const router = Router();

// Admin-only routes for database management
router.post(
    '/repair-database',
    authenticate,
    authorize('DEVELOPER_ADMIN'),
    DatabaseRepairController.repairDatabase
);

router.get(
    '/database-health',
    authenticate,
    authorize('DEVELOPER_ADMIN', 'ADMIN'),
    DatabaseRepairController.checkDatabaseHealth
);

export default router;
