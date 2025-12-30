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
router.get('/history', protect, authorize('ADMIN'), payrollController.getPayrollHistory);

export default router;
