import { Router } from 'express';
import { protect, authorize } from '../../modules/auth/middleware';
import * as payrollController from './controller';

const router = Router();

// Holidays
router.get('/holidays', protect, payrollController.listHolidays);
router.post('/holidays', protect, authorize('ADMIN'), payrollController.createHoliday);
router.delete('/holidays/:id', protect, authorize('ADMIN'), payrollController.deleteHoliday);

// Salary Processing
router.get('/draft', protect, authorize('ADMIN'), payrollController.getSalaryDraft);
router.post('/slip', protect, authorize('ADMIN'), payrollController.savePayrollSlip);
router.post('/confirm', protect, authorize('ADMIN'), payrollController.confirmPayrollRun);
router.get('/run', protect, authorize('ADMIN'), payrollController.getPayrollRun);
router.get('/history', protect, payrollController.getPayrollHistory);
router.post('/slip/:id/process', protect, authorize('ADMIN'), payrollController.processSlip);
router.delete('/slip/:id', protect, authorize('ADMIN'), payrollController.rejectSlip);

export default router;
