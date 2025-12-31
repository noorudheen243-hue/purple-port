
import { Router } from 'express';
import * as StickyController from './controller';
import { protect } from '../auth/middleware';

const router = Router();

router.use(protect);

router.get('/', StickyController.getNotes);
router.post('/', StickyController.createNote);
router.put('/:id', StickyController.updateNote);
router.delete('/:id', StickyController.deleteNote);

router.post('/:noteId/tasks', StickyController.addTask);
router.put('/tasks/:taskId', StickyController.updateTask);
router.delete('/tasks/:taskId', StickyController.deleteTask);

router.post('/:id/share', StickyController.shareNote);

export default router;
