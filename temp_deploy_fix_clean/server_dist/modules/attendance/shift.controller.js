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
exports.syncShiftLogs = exports.getShiftForDate = exports.deleteAssignment = exports.getStaffAssignments = exports.assignShift = exports.deleteShift = exports.updateShift = exports.createShift = exports.getShifts = void 0;
const shift_service_1 = require("./shift.service");
// --- Attributes ---
const getShifts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shifts = yield shift_service_1.ShiftService.listShifts();
        res.json(shifts);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getShifts = getShifts;
const createShift = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, start_time, end_time, default_grace_time } = req.body;
        // Simple Validation
        if (!name || !start_time || !end_time) {
            return res.status(400).json({ error: "Name, Start Time, and End Time are required." });
        }
        // Validate format HH:mm
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
            return res.status(400).json({ error: "Invalid time format. Use HH:mm (24-hour)." });
        }
        const shift = yield shift_service_1.ShiftService.createShift({
            name,
            start_time,
            end_time,
            default_grace_time: default_grace_time ? parseInt(default_grace_time) : 15
        });
        res.json(shift);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createShift = createShift;
const updateShift = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, start_time, end_time, default_grace_time } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (start_time)
            updateData.start_time = start_time;
        if (end_time)
            updateData.end_time = end_time;
        if (default_grace_time !== undefined)
            updateData.default_grace_time = parseInt(default_grace_time);
        const shift = yield shift_service_1.ShiftService.updateShift(id, updateData);
        res.json(shift);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateShift = updateShift;
const deleteShift = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield shift_service_1.ShiftService.deleteShift(id);
        res.json({ message: "Shift deleted successfully." });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteShift = deleteShift;
// --- Assignments ---
const assignShift = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staff_id, shift_id, from_date, to_date } = req.body;
        if (!staff_id || !shift_id || !from_date) {
            return res.status(400).json({ error: "Staff ID, Shift ID, and From Date are required." });
        }
        const assignment = yield shift_service_1.ShiftService.assignShift({
            staff_id,
            shift_id,
            from_date: new Date(from_date),
            to_date: to_date ? new Date(to_date) : null
        });
        res.json(assignment);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.assignShift = assignShift;
const getStaffAssignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId } = req.params;
        const assignments = yield shift_service_1.ShiftService.getStaffAssignments(staffId);
        res.json(assignments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getStaffAssignments = getStaffAssignments;
const deleteAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield shift_service_1.ShiftService.deleteAssignment(id);
        res.json({ message: "Assignment removed." });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteAssignment = deleteAssignment;
const getShiftForDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let { staffId, date } = req.query;
        if (!staffId) {
            staffId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        }
        if (!staffId || !date) {
            return res.status(400).json({ error: "Staff ID (or Auth) and Date are required." });
        }
        const shift = yield shift_service_1.ShiftService.getShiftForDate(staffId, new Date(date));
        res.json(shift);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getShiftForDate = getShiftForDate;
const syncShiftLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId } = req.body;
        if (!staffId)
            return res.status(400).json({ error: 'Staff ID required' });
        const { AttendanceService } = require('./service');
        const result = yield AttendanceService.syncShiftsToLogs(staffId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.syncShiftLogs = syncShiftLogs;
