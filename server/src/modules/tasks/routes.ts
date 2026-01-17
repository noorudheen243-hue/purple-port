import express from 'express';
import { getTasks, createTask, getTask, updateTask, deleteTask, getStats, startTaskTimer, stopTaskTimer } from './controller';
import { debugTasks } from './debug.controller';
import { protect } from '../auth/middleware';

const router = express.Router();

router.use(protect); // All task routes are protected

router.route('/')
    .post(createTask)
    .get(getTasks);

router.get('/stats', getStats);

router.route('/:id')
    .get(getTask)
    .patch(updateTask) // Matches Frontend api.patch
    .put(updateTask)   // Backward compatibility
    .delete(deleteTask);

router.post('/:id/timer/start', startTaskTimer);
router.post('/:id/timer/stop', stopTaskTimer);

router.get('/debug/diagnose', debugTasks);

export default router;
