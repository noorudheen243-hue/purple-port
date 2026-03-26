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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftService = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
class ShiftService {
    // --- Shift master CRUD ---
    static createShift(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.shift.create({
                data
            });
        });
    }
    static updateShift(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.shift.update({
                where: { id },
                data
            });
        });
    }
    static deleteShift(id) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if used in assignments?
            // For now, allow delete but maybe warn. Prisma might restrict if FK.
            // If we have assignments, we should probably soft delete or block.
            const count = yield prisma_1.default.staffShiftAssignment.count({ where: { shift_id: id } });
            if (count > 0)
                throw new Error("Cannot delete shift: It is assigned to staff.");
            return yield prisma_1.default.shift.delete({
                where: { id }
            });
        });
    }
    static listShifts() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.shift.findMany({
                orderBy: { name: 'asc' }
            });
        });
    }
    // --- Assignment Logic ---
    static assignShift(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Validation: Overlapping Assignments
            // We need to check if ANY active assignment overlaps with [from_date, to_date]
            // Overlap Condition: (StartA <= EndB) and (EndA >= StartB)
            // If to_date is null (infinity), we verify against infinity.
            const { staff_id, shift_id, from_date, to_date, grace_time } = data;
            // Normalize Start Date
            const IST_OFFSET = 330 * 60 * 1000;
            const tempStart = new Date(from_date);
            const istStart = new Date(tempStart.getTime() + IST_OFFSET);
            istStart.setUTCHours(0, 0, 0, 0);
            const startDate = new Date(istStart.getTime() - IST_OFFSET); // IST Midnight
            // Normalize End Date (if exists)
            let endDate = null;
            if (to_date) {
                const tempEnd = new Date(to_date);
                const istEnd = new Date(tempEnd.getTime() + IST_OFFSET);
                istEnd.setUTCHours(0, 0, 0, 0);
                endDate = new Date(istEnd.getTime() - IST_OFFSET); // IST Midnight
            }
            const overlaps = yield prisma_1.default.staffShiftAssignment.findFirst({
                where: {
                    staff_id,
                    is_active: true,
                    AND: [
                        {
                            from_date: {
                                lte: endDate || new Date('2099-12-31') // New End (or Infinity) >= Existing Start
                            }
                        },
                        {
                            OR: [
                                { to_date: null }, // Existing is Infinite
                                { to_date: { gte: startDate } } // Existing End >= New Start
                            ]
                        }
                    ]
                }
            });
            if (overlaps) {
                throw new Error(`Shift assignment overlaps with existing assignment (Start: ${overlaps.from_date.toISOString().split('T')[0]})`);
            }
            const assignment = yield prisma_1.default.staffShiftAssignment.create({
                data: {
                    staff_id,
                    shift_id,
                    from_date: startDate,
                    to_date: endDate,
                    grace_time
                }
            });
            // Retroactive/Sync: Recalculate attendance for the affected period
            try {
                const { AttendanceService } = require('./service');
                const staffMeta = yield prisma_1.default.staffProfile.findUnique({ where: { id: staff_id }, select: { user_id: true } });
                if (staffMeta) {
                    // Determine range: From start date to end date (or today if infinite)
                    // We only need to recalc up to "Today" because future records don't exist.
                    const recalcEnd = endDate && endDate < new Date() ? endDate : new Date();
                    // Only run if start date is in the past or today
                    if (startDate <= recalcEnd) {
                        yield AttendanceService.recalculateAttendance(staffMeta.user_id, startDate, recalcEnd);
                    }
                }
            }
            catch (e) {
                console.error("Failed to trigger retroactive sync:", e);
            }
            return assignment;
        });
    }
    static getStaffAssignments(staffId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.staffShiftAssignment.findMany({
                where: { staff_id: staffId, is_active: true },
                include: { shift: true },
                orderBy: { from_date: 'desc' }
            });
        });
    }
    static deleteAssignment(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const assignment = yield prisma_1.default.staffShiftAssignment.findUnique({
                where: { id },
                include: { staff: { select: { user_id: true } } }
            });
            if (!assignment)
                throw new Error("Assignment not found");
            yield prisma_1.default.staffShiftAssignment.delete({ where: { id } });
            // Retroactive Sync: Revert to Default/Legacy rules
            try {
                const { AttendanceService } = require('./service');
                const startDate = assignment.from_date;
                const endDate = assignment.to_date && assignment.to_date < new Date() ? assignment.to_date : new Date();
                if (startDate <= endDate) {
                    yield AttendanceService.recalculateAttendance(assignment.staff.user_id, startDate, endDate);
                }
            }
            catch (e) {
                console.error("Failed to trigger retroactive sync on delete:", e);
            }
            return { message: "Assignment deleted and attendance synchronized." };
        });
    }
    // --- Core Lookup for Attendance ---
    // Returns the Shift active for a specific date, with effective grace time
    static getShiftForDate(userId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Normalize date to midnight
            const IST_OFFSET = 330 * 60 * 1000;
            const istDate = new Date(date.getTime() + IST_OFFSET);
            istDate.setUTCHours(0, 0, 0, 0);
            const queryDate = new Date(istDate.getTime() - IST_OFFSET); // IST Midnight
            // 1. Get Staff Profile (Central Lookup)
            const profile = yield prisma_1.default.staffProfile.findUnique({
                where: { user_id: userId },
                select: { id: true }
            });
            if (!profile) {
                // Return Default if no profile
                return {
                    id: 'DEFAULT',
                    name: 'Default Shift',
                    start_time: '09:00',
                    end_time: '18:00',
                    default_grace_time: 15,
                    is_legacy: true
                };
            }
            // 2. Check Assignments using StaffProfile.id
            // Guard against orphaned assignments (shift deleted but assignment still references it)
            let assignment = null;
            try {
                const found = yield prisma_1.default.staffShiftAssignment.findFirst({
                    where: {
                        staff_id: profile.id,
                        is_active: true,
                        from_date: { lte: queryDate },
                        OR: [
                            { to_date: null },
                            { to_date: { gte: queryDate } }
                        ]
                    },
                    include: { shift: true }
                });
                // Only use if shift relation is not null (orphan guard)
                if (found && found.shift) {
                    assignment = found;
                }
                else if (found && !found.shift) {
                    // Orphaned assignment: auto-deactivate to prevent repeated failures
                    console.warn(`[ShiftService] Orphaned StaffShiftAssignment id=${found.id} — shift no longer exists. Deactivating.`);
                    yield prisma_1.default.staffShiftAssignment.update({
                        where: { id: found.id },
                        data: { is_active: false }
                    }).catch(() => { });
                }
            }
            catch (e) {
                // Prisma throws if required relation returns null (FK broken in DB)
                console.warn(`[ShiftService] getShiftForDate DB error (userId=${userId}): ${e.message}. Falling back to default shift.`);
            }
            if (assignment) {
                return {
                    id: assignment.shift.id,
                    name: assignment.shift.name,
                    start_time: assignment.shift.start_time,
                    end_time: assignment.shift.end_time,
                    default_grace_time: (_a = assignment.grace_time) !== null && _a !== void 0 ? _a : assignment.shift.default_grace_time,
                    is_legacy: false
                };
            }
            // 4. Default
            return {
                id: 'DEFAULT',
                name: 'Default Shift',
                start_time: '09:00',
                end_time: '18:00',
                default_grace_time: 15,
                is_legacy: true
            };
        });
    }
}
exports.ShiftService = ShiftService;
