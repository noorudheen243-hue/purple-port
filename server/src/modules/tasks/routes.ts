import express from 'express';
import { createTask, getTasks, getTask, updateTask, deleteTask, getStats } from './controller';
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

export default router;
