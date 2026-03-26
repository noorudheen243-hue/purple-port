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
exports.LeavePlannerController = void 0;
const leave_planner_service_1 = require("./leave-planner.service");
class LeavePlannerController {
    // Holidays
    static getHolidays(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const year = parseInt(req.query.year) || new Date().getFullYear();
                const data = yield leave_planner_service_1.LeavePlannerService.getHolidays(year);
                res.json(data);
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
    }
    static addHoliday(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, date, description } = req.body;
                const item = yield leave_planner_service_1.LeavePlannerService.addHoliday({ name, date, description });
                res.json(item);
            }
            catch (e) {
                res.status(400).json({ error: e.message });
            }
        });
    }
    static deleteHoliday(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield leave_planner_service_1.LeavePlannerService.deleteHoliday(req.params.id);
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
    }
    static populateSundays(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const year = parseInt(req.body.year) || new Date().getFullYear();
                const result = yield leave_planner_service_1.LeavePlannerService.populateSundays(year);
                res.json(result);
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
    }
    // Allocations
    static getAllocations(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // getAllocations
            try {
                const year = parseInt(req.query.year) || new Date().getFullYear();
                const userId = req.query.userId;
                const data = yield leave_planner_service_1.LeavePlannerService.getLeaveAllocations(year, userId);
                res.json(data);
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
    }
    static updateAllocation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { user_id, year, casual, sick, earned, unpaid } = req.body;
                const result = yield leave_planner_service_1.LeavePlannerService.updateAllocation({
                    user_id,
                    year: parseInt(year),
                    casual: parseFloat(casual),
                    sick: parseFloat(sick),
                    earned: parseFloat(earned),
                    unpaid: parseFloat(unpaid)
                });
                res.json(result);
            }
            catch (e) {
                res.status(400).json({ error: e.message });
            }
        });
    }
}
exports.LeavePlannerController = LeavePlannerController;
