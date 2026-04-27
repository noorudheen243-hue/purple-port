import { Router } from 'express';
import { StrategyController } from './strategy.controller';
import { StrategyDataController } from './strategy_data.controller';
import { protect as authenticate, authorize } from '../auth/middleware';

const router = Router();

// All strategy routes are restricted to DEVELOPER_ADMIN for the testing phase
router.get(
    '/:clientId',
    authenticate,
    authorize('DEVELOPER_ADMIN', 'ADMIN'),
    StrategyController.getFullStrategy
);

router.post(
    '/:clientId/inputs',
    authenticate,
    authorize('DEVELOPER_ADMIN', 'ADMIN'),
    StrategyController.saveInputs
);

router.get(
    '/:clientId/market',
    authenticate,
    authorize('DEVELOPER_ADMIN', 'ADMIN'),
    StrategyController.getMarketInputs
);

router.post(
    '/:clientId/market',
    authenticate,
    authorize('DEVELOPER_ADMIN', 'ADMIN'),
    StrategyController.saveMarketInputs
);

router.post(
    '/:clientId/generate',
    authenticate,
    authorize('DEVELOPER_ADMIN', 'ADMIN'),
    StrategyController.generateStrategy
);

router.post(
    '/:clientId/auto-suggest',
    authenticate,
    authorize('DEVELOPER_ADMIN', 'ADMIN'),
    StrategyController.autoSuggest
);

router.post(
    '/:clientId/versions',
    authenticate,
    authorize('DEVELOPER_ADMIN', 'ADMIN'),
    StrategyController.saveVersion
);

router.get(
    '/versions/list',
    authenticate,
    authorize('DEVELOPER_ADMIN', 'ADMIN'),
    StrategyController.listVersions
);

router.delete(
    '/versions/:id',
    authenticate,
    authorize('DEVELOPER_ADMIN', 'ADMIN'),
    StrategyController.deleteVersion
);

router.get(
    '/versions/:id',
    authenticate,
    authorize('DEVELOPER_ADMIN', 'ADMIN'),
    StrategyController.getVersion
);

// --- STRATEGY LIFECYCLE MANAGEMENT ROUTES ---

router.post(
    '/data/master',
    authenticate,
    authorize('DEVELOPER_ADMIN'),
    StrategyDataController.createMaster
);

router.post(
    '/data/save-section',
    authenticate,
    authorize('DEVELOPER_ADMIN'),
    StrategyDataController.saveSection
);

router.get(
    '/data/masters',
    authenticate,
    authorize('DEVELOPER_ADMIN'),
    StrategyDataController.listMasters
);

router.get(
    '/data/:id',
    authenticate,
    authorize('DEVELOPER_ADMIN'),
    StrategyDataController.getFullData
);

router.patch(
    '/data/:id/status',
    authenticate,
    authorize('DEVELOPER_ADMIN'),
    StrategyDataController.updateStatus
);

router.delete(
    '/data/:id',
    authenticate,
    authorize('DEVELOPER_ADMIN'),
    StrategyDataController.deleteMaster
);

router.post(
    '/data/bulk-delete',
    authenticate,
    authorize('DEVELOPER_ADMIN'),
    StrategyDataController.bulkDelete
);

export default router;
