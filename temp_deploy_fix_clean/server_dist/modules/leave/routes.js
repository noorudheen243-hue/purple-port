"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middleware_1 = require("../../modules/auth/middleware");
const router = express_1.default.Router();
router.post('/apply', middleware_1.protect, controller_1.LeaveController.applyLeave);
router.get('/my-leaves', middleware_1.protect, controller_1.LeaveController.getMyLeaves);
// Admin Routes
router.get('/requests', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), controller_1.LeaveController.getAllRequests);
router.patch('/:id/status', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), controller_1.LeaveController.updateStatus);
router.get('/history', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), controller_1.LeaveController.getHistory);
router.post('/:id/revert', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), controller_1.LeaveController.revertLeave);
router.put('/:id', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), controller_1.LeaveController.updateLeaveDetails);
router.delete('/:id', middleware_1.protect, (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'), controller_1.LeaveController.deleteLeave);
exports.default = router;
