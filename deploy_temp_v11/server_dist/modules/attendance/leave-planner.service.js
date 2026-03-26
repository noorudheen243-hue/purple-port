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
exports.LeavePlannerService = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
class LeavePlannerService {
    // --- HOLIDAYS ---
    static getHolidays(year) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = new Date(year, 0, 1);
            const end = new Date(year, 11, 31, 23, 59, 59);
            return yield prisma_1.default.holiday.findMany({
                where: {
                    date: {
                        gte: start,
                        lte: end
                    }
                },
                orderBy: { date: 'asc' }
            });
        });
    }
    static addHoliday(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if exists
            const dateObj = new Date(data.date);
            const existing = yield prisma_1.default.holiday.findUnique({
                where: { date: dateObj }
            });
            if (existing) {
                throw new Error(`Holiday already exists on ${data.date}`);
            }
            return yield prisma_1.default.holiday.create({
                data: {
                    name: data.name,
                    date: dateObj,
                    description: data.description,
                    is_recurring: data.is_recurring || false
                }
            });
        });
    }
    static deleteHoliday(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.holiday.delete({ where: { id } });
        });
    }
    static populateSundays(year) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Generate all Sundays for the year
            const sundays = [];
            const date = new Date(year, 0, 1);
            while (date.getFullYear() === year) {
                if (date.getDay() === 0) { // 0 = Sunday
                    sundays.push(new Date(date));
                }
                date.setDate(date.getDate() + 1);
            }
            let addedCount = 0;
            for (const sunday of sundays) {
                // Check existence to avoid error or duplicate if not ID based?
                // Schema has `date` as @unique. Best to use upsert or ignore catch.
                try {
                    // Upsert based on date? Prisma unique constraint on date.
                    // We'll try create and ignore failure.
                    yield prisma_1.default.holiday.upsert({
                        where: { date: sunday },
                        update: {}, // Do nothing if exists
                        create: {
                            name: 'Sunday Holiday',
                            date: sunday,
                            description: 'Weekly Off',
                            is_recurring: true
                        }
                    });
                    addedCount++;
                }
                catch (e) {
                    // Ignore collision
                }
            }
            return { message: `Processed ${sundays.length} Sundays.` };
        });
    }
    // --- LEAVE ALLOCATIONS ---
    static getLeaveAllocations(year, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get all staff (active) and their allocations
            const whereClause = { payroll_status: 'ACTIVE' };
            if (userId)
                whereClause.user_id = userId;
            const staff = yield prisma_1.default.staffProfile.findMany({
                where: Object.assign(Object.assign({}, whereClause), { staff_number: { notIn: ['QIX0001', 'QIX0002'] } }),
                include: {
                    user: {
                        select: { id: true, full_name: true, avatar_url: true, department: true }
                    }
                }
            });
            // Fetch allocations for these users for the year
            const userIds = staff.map(s => s.user_id);
            const allocations = yield prisma_1.default.leaveAllocation.findMany({
                where: {
                    user_id: { in: userIds },
                    year: year
                }
            });
            const allocMap = new Map(allocations.map(a => [a.user_id, a]));
            // Merge
            return staff.map(s => {
                const alloc = allocMap.get(s.user_id) || {
                    casual_leave: 0,
                    sick_leave: 0,
                    earned_leave: 0,
                    unpaid_leave: 0
                };
                return {
                    user_id: s.user_id,
                    staff_number: s.staff_number,
                    name: s.user.full_name,
                    department: s.department,
                    avatar_url: s.user.avatar_url,
                    allocation: alloc
                };
            });
        });
    }
    static updateAllocation(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.leaveAllocation.upsert({
                where: {
                    user_id_year: {
                        user_id: data.user_id,
                        year: data.year
                    }
                },
                update: {
                    casual_leave: data.casual,
                    sick_leave: data.sick,
                    earned_leave: data.earned,
                    unpaid_leave: data.unpaid
                },
                create: {
                    user_id: data.user_id,
                    year: data.year,
                    casual_leave: data.casual,
                    sick_leave: data.sick,
                    earned_leave: data.earned,
                    unpaid_leave: data.unpaid
                }
            });
        });
    }
}
exports.LeavePlannerService = LeavePlannerService;
