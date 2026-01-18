import express from 'express';
import { getTasks, createTask, getTask, updateTask, deleteTask, getStats, startTaskTimer, stopTaskTimer, resetData } from './controller';
import { debugTasks } from './debug.controller';
import { protect } from '../auth/middleware';

const router = express.Router();

router.use(protect); // All task routes are protected

router.route('/')
    .post(createTask)
    .get(getTasks);

router.get('/stats', getStats);

router.delete('/reset-data', resetData); // Admin Only
router.route('/:id')
    .get(getTask)
    .patch(updateTask) // Matches Frontend api.patch
    .put(updateTask)   // Backward compatibility
    .delete(deleteTask);

export default router;
