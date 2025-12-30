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
exports.getCreativeTeamMetrics = exports.getAttendanceStats = exports.getTeamPerformanceStats = exports.getManagerStats = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const date_fns_1 = require("date-fns");
const getManagerStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const today = new Date();
    const currentMonthStart = (0, date_fns_1.startOfMonth)(today);
    const lastMonthStart = (0, date_fns_1.subMonths)(currentMonthStart, 1);
    // Active Campaigns
    const activeCampaigns = yield prisma_1.default.campaign.count({
        where: {
            status: { not: 'COMPLETED' }, // Assuming 'COMPLETED' is a status, though schema default is 'PLANNING'
            end_date: { gte: today }
        }
    });
    // Pending Reviews (Tasks in REVIEW)
    const pendingReviews = yield prisma_1.default.task.count({
        where: { status: 'REVIEW' }
    });
    // Monthly Budget (Sum of budget of active campaigns overlapping this month)
    // Simplified: Sum of budgets of campaigns starting after currentMonthStart
    const campaignsThisMonth = yield prisma_1.default.campaign.findMany({
        where: {
            start_date: { gte: currentMonthStart }
        },
        select: { budget: true }
    });
    const monthlyBudget = campaignsThisMonth.reduce((acc, curr) => acc + (curr.budget || 0), 0);
    // Productivity: Completed Tasks Count This Month
    const completedTasksThisMonth = yield prisma_1.default.task.count({
        where: {
            status: 'COMPLETED',
            updatedAt: { gte: currentMonthStart } // Best proxy for completion date if completed_date is null
        }
    });
    return {
        activeCampaigns,
        pendingReviews,
        monthlyBudget,
        completedTasksThisMonth
    };
});
exports.getManagerStats = getManagerStats;
const getTeamPerformanceStats = () => __awaiter(void 0, void 0, void 0, function* () {
    // Fetch all staff members with basic details
    const staff = yield prisma_1.default.user.findMany({
        where: {
            // role: { in: ['MARKETING_EXEC', 'WEB_SEO_EXECUTIVE', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'MANAGER'] },
            // UPDATED: Filter for Creative Team only as per user request
            department: 'CREATIVE'
        },
        select: {
            id: true,
            full_name: true,
            role: true,
            avatar_url: true
        }
    });
    // Calculate metrics for each staff member
    const performanceData = yield Promise.all(staff.map((user) => __awaiter(void 0, void 0, void 0, function* () {
        const totalTasks = yield prisma_1.default.task.count({
            where: { assignee_id: user.id }
        });
        const completedTasks = yield prisma_1.default.task.count({
            where: {
                assignee_id: user.id,
                status: 'COMPLETED'
            }
        });
        const pendingTasks = yield prisma_1.default.task.count({
            where: {
                assignee_id: user.id,
                status: { not: 'COMPLETED' }
            }
        });
        // Calculate Average Rating (mock logic if rating not implemented fully, assuming 0-5)
        // Check if rating field exists in schema, otherwise skip or default
        // Schema has `completion_rating Int?`
        const ratingAgg = yield prisma_1.default.task.aggregate({
            where: { assignee_id: user.id, status: 'COMPLETED' },
            _avg: { completion_rating: true }
        });
        return {
            id: user.id,
            name: user.full_name,
            role: user.role,
            avatar: user.avatar_url,
            totalTasks,
            completedTasks,
            pendingTasks,
            rating: ratingAgg._avg.completion_rating || 0,
            efficiency: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        };
    })));
    return performanceData;
});
exports.getTeamPerformanceStats = getTeamPerformanceStats;
const getAttendanceStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    // Get all active employees to calculate total expected vs present
    // Group by department
    // We need: Department Name, Present Count, Total Count (optional but good for %), Absent Count
    // 1. Get Today's Attendance Records
    const attendanceRecords = yield prisma_1.default.attendanceRecord.findMany({
        where: {
            date: {
                gte: todayStart,
                lte: todayEnd
            },
            status: { in: ['PRESENT', 'WFH', 'HALF_DAY'] }
        },
        include: {
            user: {
                select: { department: true }
            }
        }
    });
    // 2. Aggregate counts by Department
    const departmentCounts = {
        'CREATIVE': 0,
        'MARKETING': 0,
        'WEB': 0,
        'MANAGEMENT': 0
    };
    attendanceRecords.forEach(record => {
        const dept = record.user.department || 'OTHER';
        if (departmentCounts[dept] !== undefined) {
            departmentCounts[dept]++;
        }
    });
    return [
        {
            department: 'Creative Team',
            count: departmentCounts['CREATIVE'],
            // Box: Purple, Value: Yellow, Text: White
            styles: {
                card: 'bg-primary', // Purple
                text: 'text-white',
                value: 'text-yellow-400',
                label: 'text-white/80' // Slightly muted white for label
            }
        },
        {
            department: 'Digital Marketing',
            count: departmentCounts['MARKETING'],
            // Box: Yellow, Value: Purple, Text: Black
            styles: {
                card: 'bg-secondary', // Yellow
                text: 'text-black',
                value: 'text-primary', // Purple
                label: 'text-black/70'
            }
        },
        {
            department: 'SEO & Web',
            count: departmentCounts['WEB'],
            // Box: Purple, Value: Yellow, Text: White
            styles: {
                card: 'bg-primary',
                text: 'text-white',
                value: 'text-yellow-400',
                label: 'text-white/80'
            }
        },
        {
            department: 'Management',
            count: departmentCounts['MANAGEMENT'],
            // Box: Yellow, Value: Purple, Text: Black
            styles: {
                card: 'bg-secondary',
                text: 'text-black',
                value: 'text-primary',
                label: 'text-black/70'
            }
        }
    ];
});
exports.getAttendanceStats = getAttendanceStats;
const getCreativeTeamMetrics = () => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Creative Team Users
    const creatives = yield prisma_1.default.user.findMany({
        where: { department: 'CREATIVE' },
        select: { id: true }
    });
    const creativeIds = creatives.map(c => c.id);
    // 2. Task Counts
    const totalTasks = yield prisma_1.default.task.count({
        where: { assignee_id: { in: creativeIds } }
    });
    const completedTasks = yield prisma_1.default.task.count({
        where: { assignee_id: { in: creativeIds }, status: 'COMPLETED' }
    });
    const wipTasks = yield prisma_1.default.task.count({
        where: { assignee_id: { in: creativeIds }, status: 'IN_PROGRESS' }
    });
    const reviewTasks = yield prisma_1.default.task.count({
        where: { assignee_id: { in: creativeIds }, status: 'REVIEW' }
    });
    const plannedTasks = yield prisma_1.default.task.count({
        where: { assignee_id: { in: creativeIds }, status: 'PLANNED' }
    });
    return {
        total: totalTasks,
        completed: completedTasks,
        wip: wipTasks,
        review: reviewTasks,
        planned: plannedTasks,
        pieChartData: [
            { name: 'Completed', value: completedTasks, fill: '#10b981' }, // Green
            { name: 'In Progress', value: wipTasks, fill: '#3b82f6' }, // Blue
            { name: 'Review', value: reviewTasks, fill: '#f59e0b' }, // Yellow
            { name: 'Planned', value: plannedTasks, fill: '#94a3b8' } // Slate
        ]
    };
});
exports.getCreativeTeamMetrics = getCreativeTeamMetrics;
