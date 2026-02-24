"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveController = void 0;
const service_1 = require("./service");
class LeaveController {
    static applyLeave(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId)
                    return res.status(401).json({ message: 'Unauthorized' });
                const { type, start_date, end_date, reason } = req.body;
                const leave = yield service_1.LeaveService.applyLeave(userId, type, new Date(start_date), new Date(end_date), reason);
                res.status(201).json(leave);
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static getMyLeaves(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId)
                    return res.status(401).json({ message: 'Unauthorized' });
                const leaves = yield service_1.LeaveService.getLeaveRequests(userId);
                res.status(200).json(leaves);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Admin/Manager Action
    static getAllRequests(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check role?
                const leaves = yield service_1.LeaveService.getLeaveRequests(undefined, 'PENDING');
                res.status(200).json(leaves);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static updateStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const approverId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!approverId)
                    return res.status(401).json({ message: 'Unauthorized' });
                const { id } = req.params;
                const { status, rejection_reason } = req.body;
                if (!['APPROVED', 'REJECTED'].includes(status)) {
                    return res.status(400).json({ message: 'Invalid status' });
                }
                const updated = yield service_1.LeaveService.updateLeaveStatus(id, approverId, status, rejection_reason);
                res.status(200).json(updated);
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static getHistory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year, status } = req.query;
                const history = yield service_1.LeaveService.getLeaveHistory(parseInt(month), parseInt(year), status);
                res.status(200).json(history);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    static revertLeave(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const updated = yield service_1.LeaveService.revertLeaveStatus(id);
                res.status(200).json(updated);
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static updateLeaveDetails(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const { id } = req.params;
                const { type, start_date, end_date, reason } = req.body;
                // Admin only or owner? Assuming Admin for "Approvals" page edits
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'MANAGER' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'DEVELOPER_ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const result = yield service_1.LeaveService.updateLeaveDetails(id, {
                    type,
                    start_date: start_date ? new Date(start_date) : undefined,
                    end_date: end_date ? new Date(end_date) : undefined,
                    reason
                });
                res.status(200).json(result);
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    static deleteLeave(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                yield service_1.LeaveService.deleteLeaveRequest(id);
                res.status(204).send();
            }
            catch (error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
}
exports.LeaveController = LeaveController;
