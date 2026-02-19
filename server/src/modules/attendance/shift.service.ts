import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

export class ShiftService {

    // --- Shift master CRUD ---

    static async createShift(data: { name: string; start_time: string; end_time: string; default_grace_time?: number }) {
        return await prisma.shift.create({
            data
        });
    }

    static async updateShift(id: string, data: { name?: string; start_time?: string; end_time?: string; default_grace_time?: number }) {
        return await prisma.shift.update({
            where: { id },
            data
        });
    }

    static async deleteShift(id: string) {
        // Check if used in assignments?
        // For now, allow delete but maybe warn. Prisma might restrict if FK.
        // If we have assignments, we should probably soft delete or block.
        const count = await prisma.staffShiftAssignment.count({ where: { shift_id: id } });
        if (count > 0) throw new Error("Cannot delete shift: It is assigned to staff.");

        return await prisma.shift.delete({
            where: { id }
        });
    }

    static async listShifts() {
        return await prisma.shift.findMany({
            orderBy: { name: 'asc' }
        });
    }

    // --- Assignment Logic ---

    static async assignShift(data: { staff_id: string; shift_id: string; from_date: Date; to_date?: Date | null; grace_time?: number }) {
        // 1. Validation: Overlapping Assignments
        // We need to check if ANY active assignment overlaps with [from_date, to_date]
        // Overlap Condition: (StartA <= EndB) and (EndA >= StartB)
        // If to_date is null (infinity), we verify against infinity.

        const { staff_id, shift_id, from_date, to_date, grace_time } = data;

        // Normalize Start Date
        const startDate = new Date(from_date);
        startDate.setHours(0, 0, 0, 0);

        // Normalize End Date (if exists)
        let endDate: Date | null | undefined = to_date ? new Date(to_date) : null;
        if (endDate) endDate.setHours(0, 0, 0, 0);

        const overlaps = await prisma.staffShiftAssignment.findFirst({
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

        const assignment = await prisma.staffShiftAssignment.create({
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
            const staffMeta = await prisma.staffProfile.findUnique({ where: { id: staff_id }, select: { user_id: true } });
            if (staffMeta) {
                // Determine range: From start date to end date (or today if infinite)
                // We only need to recalc up to "Today" because future records don't exist.
                const recalcEnd = endDate && endDate < new Date() ? endDate : new Date();

                // Only run if start date is in the past or today
                if (startDate <= recalcEnd) {
                    await AttendanceService.recalculateAttendance(staffMeta.user_id, startDate, recalcEnd);
                }
            }
        } catch (e) {
            console.error("Failed to trigger retroactive sync:", e);
        }

        return assignment;
    }

    static async getStaffAssignments(staffId: string) {
        return await prisma.staffShiftAssignment.findMany({
            where: { staff_id: staffId, is_active: true },
            include: { shift: true },
            orderBy: { from_date: 'desc' }
        });
    }

    static async deleteAssignment(id: string) {
        const assignment = await prisma.staffShiftAssignment.findUnique({
            where: { id },
            include: { staff: { select: { user_id: true } } }
        });

        if (!assignment) throw new Error("Assignment not found");

        await prisma.staffShiftAssignment.delete({ where: { id } });

        // Retroactive Sync: Revert to Default/Legacy rules
        try {
            const { AttendanceService } = require('./service');
            const startDate = assignment.from_date;
            const endDate = assignment.to_date && assignment.to_date < new Date() ? assignment.to_date : new Date();

            if (startDate <= endDate) {
                await AttendanceService.recalculateAttendance(assignment.staff.user_id, startDate, endDate);
            }
        } catch (e) {
            console.error("Failed to trigger retroactive sync on delete:", e);
        }

        return { message: "Assignment deleted and attendance synchronized." };
    }

    // --- Core Lookup for Attendance ---

    // Returns the Shift active for a specific date, with effective grace time
    static async getShiftForDate(userId: string, date: Date) {
        // Normalize date to midnight
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0);

        // 1. Get Staff Profile (Central Lookup)
        const profile = await prisma.staffProfile.findUnique({
            where: { user_id: userId },
            select: { id: true, shift_timing: true, grace_time: true }
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
        let assignment: any = null;
        try {
            const found = await prisma.staffShiftAssignment.findFirst({
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
            } else if (found && !found.shift) {
                // Orphaned assignment: auto-deactivate to prevent repeated failures
                console.warn(`[ShiftService] Orphaned StaffShiftAssignment id=${found.id} — shift no longer exists. Deactivating.`);
                await prisma.staffShiftAssignment.update({
                    where: { id: found.id },
                    data: { is_active: false }
                }).catch(() => { });
            }
        } catch (e: any) {
            // Prisma throws if required relation returns null (FK broken in DB)
            console.warn(`[ShiftService] getShiftForDate DB error (userId=${userId}): ${e.message}. Falling back to default shift.`);
        }

        if (assignment) {
            return {
                id: assignment.shift.id,
                name: assignment.shift.name,
                start_time: assignment.shift.start_time,
                end_time: assignment.shift.end_time,
                default_grace_time: assignment.grace_time ?? assignment.shift.default_grace_time,
                is_legacy: false
            };
        }

        // 3. Fallback: Legacy String
        if (profile.shift_timing) {
            const { start, end } = this.parseLegacyTiming(profile.shift_timing);
            return {
                id: 'LEGACY',
                name: 'Legacy Shift',
                start_time: start,
                end_time: end,
                default_grace_time: profile.grace_time || 15,
                is_legacy: true
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
    }

    // Helper from AttendanceService (moved/duplicated here for separation)
    private static parseLegacyTiming(timingStr: string) {
        const defaultShift = { start: '09:00', end: '18:00' };
        if (!timingStr) return defaultShift;

        const parts = timingStr.split('-').map(s => s.trim());
        if (parts.length !== 2) return defaultShift;

        const to24h = (time12h: string) => {
            const [time, modifier] = time12h.split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') {
                hours = modifier === 'PM' ? '12' : '00';
            } else if (modifier === 'PM') {
                hours = String(parseInt(hours, 10) + 12);
            }
            return `${hours}:${minutes}`;
        };

        return { start: to24h(parts[0]), end: to24h(parts[1]) };
    }
}
