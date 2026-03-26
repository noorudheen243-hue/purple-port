import express from 'express';
import { getTasks, createTask, getTask, updateTask, deleteTask, getStats, startTaskTimer, stopTaskTimer, resetData, clearActiveTasks, clearAllTasks, getTaskClearanceStats } from './controller';
import { debugTasks } from './debug.controller';
import { protect, authorize } from '../auth/middleware';
import { ROLES } from '../auth/roles';

const router = express.Router();

router.use(protect); // All task routes are protected

router.route('/')
    .post(createTask) // All staff can create
    .get(getTasks);

router.get('/stats', getStats);

router.delete('/reset-data', authorize(ROLES.DEVELOPER_ADMIN), resetData); // Developer Admin Only
router.delete('/clear-active', authorize(ROLES.DEVELOPER_ADMIN), clearActiveTasks); // Developer Admin Only

// Bulk operations
router.get('/bulk/stats', authorize(ROLES.DEVELOPER_ADMIN), getTaskClearanceStats); // Get deletion stats
router.post('/bulk/clear-all', authorize(ROLES.DEVELOPER_ADMIN), clearAllTasks); // Clear all tasks

// Timer routes
router.post('/:id/timer/start', startTaskTimer);
router.post('/:id/timer/stop', stopTaskTimer);

router.route('/:id')
    .get(getTask)
    .patch(updateTask) // Content restriction logic usually in service
    .put(updateTask)
    .delete(authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DM_EXECUTIVE, ROLES.WEB_SEO_EXECUTIVE, ROLES.CREATIVE_DESIGNER, ROLES.OPERATIONS_EXECUTIVE), deleteTask); // All staff can delete

export default router;
