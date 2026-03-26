import express from 'express';
import { protect, authorize } from '../auth/middleware';
import { ROLES } from '../auth/roles';
import * as controller from './controller';

const router = express.Router();

router.use(protect);

router.post('/schedule', controller.scheduleMeeting);
router.get('/', controller.getMeetings);
router.get('/my-meetings', controller.getMyMeetings);
router.get('/reports', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.getMeetingReports);

// MoM
router.post('/:id/mom', controller.submitMoM);
router.get('/:id/mom', controller.getMoM);

// Admin Inbox & Actions
router.get('/admin/inbox', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.getAdminInbox);
router.patch('/mom/:momId/review', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.reviewMoM);

// Edit & Delete (Admin/Manager only)
router.patch('/:id', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), controller.updateMeeting);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN), controller.deleteMeeting);

// Details
router.get('/:id', controller.getMeetingDetails);

export default router;
