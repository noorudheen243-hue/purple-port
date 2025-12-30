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
exports.getPerformanceReport = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const getPerformanceReport = (period, startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    // Determine date range if period is generic, but user provided explicit dates so we trust them primarily.
    // If logic needed for 'WEEKLY' etc to default, we can add, but spec says startDate/endDate required.
    // Fetch all completed tasks in range
    const tasks = yield prisma_1.default.task.findMany({
        where: {
            status: 'COMPLETED',
            completed_date: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            assignee: {
                select: {
                    id: true,
                    full_name: true,
                    role: true
                }
            }
        }
    });
    // Group by Staff
    const staffMap = new Map();
    tasks.forEach(task => {
        var _a;
        if (task.assignee) {
            const assigneeId = task.assignee.id;
            if (!staffMap.has(assigneeId)) {
                staffMap.set(assigneeId, {
                    staffName: task.assignee.full_name,
                    staffId: assigneeId,
                    tasks: []
                });
            }
            (_a = staffMap.get(assigneeId)) === null || _a === void 0 ? void 0 : _a.tasks.push(task);
        }
    });
    const categories = ['GENERIC', 'GRAPHIC_DESIGN', 'VIDEO_EDITING', 'WEB_DEVELOPMENT', 'MARKETING'];
    // Calculate Metrics
    const report = Array.from(staffMap.values()).map(staff => {
        const totalCompleted = staff.tasks.length;
        // Fetch total assigned to calculate completion rate? 
        // Spec says "completionRate: 0.85 // (Completed / Total Tasks)"
        // This implies we need Total Tasks *Assigned* in that period, not just completed.
        // We need a separate query or adjust the main query to fetch ALL tasks, then filter.
        // Let's adjust to fetch ALL tasks.
        return {
            staffName: staff.staffName,
            staffId: staff.staffId,
            totalTasksCompleted: totalCompleted,
            tempTasks: staff.tasks // Placeholder passing to next step if we did it inline
        };
    });
    // REFACTORING LOGIC to match Requirement: Rate = Completed / Total
    // We need two sets of data: Tasks Completed in Window, and Tasks Assigned in Window (or Due in Window?)
    // "Total Tasks" usually means "Tasks that were reachable/due in this period". 
    // Let's assume "Total Tasks" = "Tasks Created or Due or Completed in this period".
    // For simplicity and standard reporting: "Total Tasks Assigned in this period".
    const allTasksInRange = yield prisma_1.default.task.findMany({
        where: {
            assignee: { isNot: null },
            createdAt: { gte: startDate, lte: endDate } // Tasks coming in
            // OR completed in range? Usually performance is based on "What came in vs what I did".
        },
        include: { assignee: true }
    });
    // Actually, a better metric for "Completion Rate" in a specific period is usually:
    // (Tasks Completed in Period) / (Tasks Assigned in Period). 
    // Or (Tasks Completed in Period) / (Tasks Due in Period).
    // Let's stick to the user's prompt structure which implies we have both counts.
    // Let's build the aggregation properly.
    const users = yield prisma_1.default.user.findMany({
        where: { role: { in: ['MARKETING_EXEC', 'WEB_SEO', 'DESIGNER', 'MANAGER', 'ADMIN'] } },
        select: { id: true, full_name: true }
    });
    const finalReport = yield Promise.all(users.map((user) => __awaiter(void 0, void 0, void 0, function* () {
        // Total tasks assigned in this period
        const totalTasks = yield prisma_1.default.task.count({
            where: {
                assignee_id: user.id,
                createdAt: { gte: startDate, lte: endDate }
            }
        });
        // Completed tasks in this period
        const completedTasks = yield prisma_1.default.task.findMany({
            where: {
                assignee_id: user.id,
                status: 'COMPLETED',
                // For completion, we usually check updated_at or completed_date
                completed_date: { gte: startDate, lte: endDate }
            }
        });
        // Break down by category (using only completed? Or total? "categoryBreakdown... completed, total, rate")
        // We need both for every category.
        const categoryBreakdown = {};
        for (const cat of categories) {
            const catTotal = yield prisma_1.default.task.count({
                where: {
                    assignee_id: user.id,
                    category: cat,
                    createdAt: { gte: startDate, lte: endDate }
                }
            });
            const catCompleted = completedTasks.filter(t => t.category === cat).length;
            categoryBreakdown[cat] = {
                completed: catCompleted,
                total: catTotal,
                rate: catTotal > 0 ? Number((catCompleted / catTotal).toFixed(2)) : 0
            };
        }
        const stats = {
            staffName: user.full_name,
            staffId: user.id,
            totalTasksCompleted: completedTasks.length,
            completionRate: totalTasks > 0 ? Number((completedTasks.length / totalTasks).toFixed(2)) : 0,
            categoryBreakdown
        };
        return stats;
    })));
    // Filter out users with 0 activity to keep it clean? Or keep them? 
    // Usually keep them to show they did nothing if they are staff.
    // Let's sort by completion rate.
    return finalReport.sort((a, b) => b.totalTasksCompleted - a.totalTasksCompleted);
});
exports.getPerformanceReport = getPerformanceReport;
