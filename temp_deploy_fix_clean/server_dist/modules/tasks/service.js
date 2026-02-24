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
exports.calculateDashboardAggregates = exports.clearActiveTasks = exports.wipeAllTaskData = exports.getDashboardStats = exports.getTaskStats = exports.deleteTask = exports.updateTask = exports.stopTimer = exports.startTimer = exports.getTaskById = exports.getTasks = exports.createTask = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const service_1 = require("../notifications/service");
const socket_1 = __importDefault(require("../../socket"));
// Helper to calculate SLA
const calculateSLA = (priority = 'MEDIUM') => {
    const now = new Date();
    const hours = {
        'URGENT': 24,
        'HIGH': 48,
        'MEDIUM': 72,
        'LOW': 168 // 1 week
    }[priority] || 72;
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
};
const createTask = (data) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const createData = Object.assign({}, data);
    // 0. STRICT VALIDATION (Agency Master Prompt Phase 2)
    if (!createData.title)
        throw new Error("Task Title is required.");
    // Default Category & Nature if missing (Safety Net)
    // Cast to any to assume fields exist in new client
    if (!createData.category)
        createData.category = 'CAMPAIGN';
    if (!createData.nature)
        createData.nature = 'NEW';
    const isCampaignTask = createData.category === 'CAMPAIGN';
    // Campaign is strictly required ONLY for Campaign Tasks.
    // MODIFIED: User requested removing Campaign Selector, so we relax this check.
    // Tasks can now be 'CAMPAIGN' category (client work) without a specific campaign_id.
    /*
    if (isCampaignTask && !createData.campaign?.connect?.id) {
        throw new Error("Campaign Task MUST be linked to a Campaign.");
    }
    */
    // 1. Hierarchy & Automation (Auto-Assign from Campaign)
    if ((_b = (_a = createData.campaign) === null || _a === void 0 ? void 0 : _a.connect) === null || _b === void 0 ? void 0 : _b.id) {
        const campaign = yield prisma_1.default.campaign.findUnique({
            where: { id: createData.campaign.connect.id },
            select: { default_assignee_id: true, client_id: true }
        });
        if (campaign) {
            // If client link missing but campaign exists, link to campaign's client
            if (!((_d = (_c = createData.client) === null || _c === void 0 ? void 0 : _c.connect) === null || _d === void 0 ? void 0 : _d.id)) {
                createData.client = { connect: { id: campaign.client_id } };
            }
            // Auto-Assign if missing
            if (!((_f = (_e = createData.assignee) === null || _e === void 0 ? void 0 : _e.connect) === null || _f === void 0 ? void 0 : _f.id) && campaign.default_assignee_id) {
                createData.assignee = { connect: { id: campaign.default_assignee_id } };
            }
        }
    }
    // 2. SLA Calculation (If not provided manually)
    if (!createData.sla_target) {
        createData.sla_target = calculateSLA(createData.priority);
    }
    // 3. AI Estimation Stub (Random 30-180 mins for generic tasks)
    // Using 'any' cast to avoid TS error on new schema field if types aren't regenerated yet
    if (!createData.ai_estimated_minutes) {
        createData.ai_estimated_minutes = Math.floor(Math.random() * (180 - 30 + 1) + 30);
    }
    // 4. Set Initial SLA Status & Nature Default
    createData.sla_status = 'ON_TRACK';
    // 5. Generate QIX Sequence ID
    const lastTask = yield prisma_1.default.task.findFirst({
        orderBy: { sequence_id: 'desc' },
        select: { sequence_id: true }
    });
    const nextSequenceId = ((lastTask === null || lastTask === void 0 ? void 0 : lastTask.sequence_id) || 0) + 1;
    createData.sequence_id = nextSequenceId;
    const task = yield prisma_1.default.task.create({
        data: createData,
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true } },
            reporter: { select: { id: true, full_name: true, avatar_url: true } },
            assigned_by: { select: { id: true, full_name: true, avatar_url: true } }, // Ensure return
        }
    });
    try {
        if (task.assignee_id) {
            yield (0, service_1.createNotification)(task.assignee_id, 'TASK_ASSIGNED', `You have been assigned to task: ${task.title}`, `/dashboard/tasks/${task.id}`);
            // Real-time Push
            socket_1.default.emitToUser(task.assignee_id, 'task_created', task);
        }
        // Also emit to the reporter (creator) so their list updates instantly
        socket_1.default.emitToUser(task.reporter_id, 'task_created', task);
    }
    catch (e) {
        console.error("Notification Error (Create Task):", e);
    }
    return task;
});
exports.createTask = createTask;
const getTasks = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    const whereClause = {};
    if (filters.campaign_id)
        whereClause.campaign_id = filters.campaign_id;
    if (filters.client_id)
        whereClause.client_id = filters.client_id;
    if (filters.assignee_id)
        whereClause.assignee_id = filters.assignee_id;
    if (filters.status)
        whereClause.status = filters.status;
    if (filters.priority)
        whereClause.priority = filters.priority;
    // Date Range Filtering (Mixed: Due Date OR Created At OR Start Date)
    if (filters.startDate && filters.endDate) {
        whereClause.OR = [
            { createdAt: { gte: filters.startDate, lte: filters.endDate } },
            { actual_start_date: { gte: filters.startDate, lte: filters.endDate } }
        ];
    }
    else if (!filters.status) {
        // PERF FIX: "Smart Board View"
        // If no specific status or date range is requested (default board view),
        // fetch ALL Active tasks, but restrict COMPLETED tasks to last 30 days.
        // This prevents loading 10,000 old completed tasks on the board.
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        whereClause.OR = [
            { status: { not: 'COMPLETED' } },
            {
                status: 'COMPLETED',
                updatedAt: { gte: thirtyDaysAgo }
            }
        ];
    }
    return yield prisma_1.default.task.findMany({
        where: whereClause,
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true, department: true } }, // Added department
            reporter: { select: { id: true, full_name: true, avatar_url: true } },
            campaign: { include: { client: true } },
            client: { select: { name: true } },
            assigned_by: { select: { id: true, full_name: true, avatar_url: true } }, // Ensure assigned_by is fetched with avatar
            _count: { select: { comments: true, assets: true, sub_tasks: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
});
exports.getTasks = getTasks;
const getTaskById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.task.findUnique({
        where: { id },
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true } },
            reporter: { select: { id: true, full_name: true, avatar_url: true } },
            assigned_by: { select: { id: true, full_name: true, avatar_url: true } }, // Added
            campaign: { include: { client: true } },
            client: { select: { name: true } },
            sub_tasks: true,
            dependencies: {
                include: { blocking_task: { select: { id: true, title: true, status: true } } }
            },
            dependents: {
                include: { blocked_task: { select: { id: true, title: true, status: true } } }
            },
            comments: {
                include: { author: { select: { id: true, full_name: true, avatar_url: true } } },
                orderBy: { createdAt: 'asc' }
            },
            assets: {
                orderBy: { createdAt: 'desc' }
            },
            // Check for active timer
            timeLogs: {
                where: { end_time: null },
                take: 1
            }
        }
    });
});
exports.getTaskById = getTaskById;
const startTimer = (taskId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if already running
    const activeLog = yield prisma_1.default.timeLog.findFirst({
        where: { task_id: taskId, user_id: userId, end_time: null }
    });
    if (activeLog)
        return activeLog; // Already running
    return yield prisma_1.default.timeLog.create({
        data: {
            task_id: taskId,
            user_id: userId,
            start_time: new Date()
        }
    });
});
exports.startTimer = startTimer;
const stopTimer = (taskId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const activeLog = yield prisma_1.default.timeLog.findFirst({
        where: { task_id: taskId, user_id: userId, end_time: null }
    });
    if (!activeLog)
        throw new Error("No active timer found");
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - activeLog.start_time.getTime()) / 60000); // Minutes
    return yield prisma_1.default.timeLog.update({
        where: { id: activeLog.id },
        data: {
            end_time: endTime,
            duration_minutes: duration
        }
    });
});
exports.stopTimer = stopTimer;
const updateTask = (id, data, userId) => __awaiter(void 0, void 0, void 0, function* () {
    // Automatic Timestamping Logic
    if (data.status) {
        if (data.status === 'IN_PROGRESS') {
            const current = yield prisma_1.default.task.findUnique({ where: { id }, select: { actual_start_date: true } });
            if (!(current === null || current === void 0 ? void 0 : current.actual_start_date)) {
                data.actual_start_date = new Date();
            }
        }
        if (data.status === 'COMPLETED') {
            data.completed_date = new Date();
        }
    }
    const existingTask = yield prisma_1.default.task.findUnique({ where: { id } });
    const updatedTask = yield prisma_1.default.task.update({
        where: { id },
        data,
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true } },
        }
    });
    try {
        if (existingTask) {
            // -- SYSTEM COMMENT LOGIC (Status History) --
            if (updatedTask.status !== existingTask.status && userId) {
                // Fetch actor name
                const actor = yield prisma_1.default.user.findUnique({ where: { id: userId }, select: { full_name: true } });
                const actorName = actor ? actor.full_name : 'System';
                // Create System Comment
                yield prisma_1.default.comment.create({
                    data: {
                        task_id: id,
                        author_id: userId, // The user performing the action
                        content: `System: Status changed from ${existingTask.status} to ${updatedTask.status} by ${actorName}`,
                        is_revision_request: false // Reuse existing boolean or add 'is_system' later if needed. For now, text prefix suffices.
                    }
                });
            }
            // Notify new assignee
            if (updatedTask.assignee_id && updatedTask.assignee_id !== existingTask.assignee_id) {
                yield (0, service_1.createNotification)(updatedTask.assignee_id, 'TASK_ASSIGNED', `You have been assigned to task: ${updatedTask.title}`, `/dashboard/tasks/${updatedTask.id}`);
                socket_1.default.emitToUser(updatedTask.assignee_id, 'task_created', updatedTask); // Treat as new for them
            }
            // Notify reporter on status change
            if (updatedTask.status !== existingTask.status) {
                yield (0, service_1.createNotification)(updatedTask.reporter_id, 'TASK_UPDATED', `Task "${updatedTask.title}" is now ${updatedTask.status}`, `/dashboard/tasks/${updatedTask.id}`);
            }
            // General Update Broadcast
            // Emit to assignee and reporter
            if (updatedTask.assignee_id)
                socket_1.default.emitToUser(updatedTask.assignee_id, 'task_updated', updatedTask);
            socket_1.default.emitToUser(updatedTask.reporter_id, 'task_updated', updatedTask);
        }
    }
    catch (e) {
        console.error("Notification Error (Update Task):", e);
    }
    return updatedTask;
});
exports.updateTask = updateTask;
const deleteTask = (id) => __awaiter(void 0, void 0, void 0, function* () {
    // Break Parent-Child relation before delete (Simulate SetNull)
    yield prisma_1.default.task.updateMany({
        where: { parent_task_id: id },
        data: { parent_task_id: null }
    });
    return yield prisma_1.default.task.delete({
        where: { id }
    });
});
exports.deleteTask = deleteTask;
const getTaskStats = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    const whereClause = {};
    if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
            gte: filters.startDate,
            lte: filters.endDate
        };
    }
    // Fetch all relevant tasks with assignee info
    const tasks = yield prisma_1.default.task.findMany({
        where: whereClause,
        select: {
            id: true,
            status: true,
            priority: true,
            assignee: {
                select: {
                    id: true,
                    full_name: true,
                    department: true
                }
            },
            client: {
                select: {
                    name: true
                }
            },
            due_date: true
        }
    });
    // Aggregation Logic
    const stats = {};
    tasks.forEach(task => {
        var _a, _b, _c;
        let key = 'Unassigned';
        if (filters.groupBy === 'staff') {
            key = ((_a = task.assignee) === null || _a === void 0 ? void 0 : _a.full_name) || 'Unassigned';
        }
        else if (filters.groupBy === 'department') {
            key = ((_b = task.assignee) === null || _b === void 0 ? void 0 : _b.department) || 'Unassigned';
        }
        else if (filters.groupBy === 'client') {
            key = ((_c = task.client) === null || _c === void 0 ? void 0 : _c.name) || 'No Client';
        }
        else if (filters.groupBy === 'status') {
            key = task.status;
        }
        if (!stats[key]) {
            stats[key] = { total: 0, completed: 0, pending: 0, overdue: 0 };
        }
        stats[key].total++;
        if (task.status === 'COMPLETED') {
            stats[key].completed++;
        }
        else {
            stats[key].pending++;
            // Check Overdue
            if (task.due_date && new Date(task.due_date) < new Date() && task.status !== 'COMPLETED') {
                stats[key].overdue++;
            }
        }
    });
    // Convert to Array
    return Object.entries(stats).map(([key, value]) => (Object.assign(Object.assign({ name: key }, value), { rate: value.total > 0 ? Math.round((value.completed / value.total) * 100) : 0 })));
});
exports.getTaskStats = getTaskStats;
const getDashboardStats = (user) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Determine Scope
    // Including MARKETING_EXEC in managerial view as per previous logic
    const isManagerial = ['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN', 'MARKETING_EXEC', 'WEB_SEO_EXECUTIVE'].includes(user.role) || user.department === 'MARKETING' || user.department === 'WEB';
    // 2. Task Status Distribution
    const distributionWhere = isManagerial ? {} : { assignee_id: user.id };
    const statusRaw = yield prisma_1.default.task.groupBy({
        by: ['status'],
        where: distributionWhere,
        _count: { id: true }
    });
    const statusDistribution = statusRaw.map(s => ({ name: s.status, value: s._count.id }));
    // 3. Efficiency Stats (Optimized)
    let efficiencyStats = [];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    if (isManagerial) {
        // Creative Team Efficiency (All staff in CREATIVE department)
        // Fetch all tasks for creative staff in one go, grouped by assignee
        // First get creative staff IDs to filter
        const creativeStaff = yield prisma_1.default.staffProfile.findMany({
            where: { department: 'CREATIVE' },
            select: { user_id: true, user: { select: { full_name: true } } }
        });
        const creativeIds = creativeStaff.map(s => s.user_id);
        if (creativeIds.length > 0) {
            // Group by assignee and status
            const rawStats = yield prisma_1.default.task.groupBy({
                by: ['assignee_id', 'status'],
                where: {
                    assignee_id: { in: creativeIds },
                    createdAt: { gte: startOfMonth }
                },
                _count: { id: true }
            });
            // Map results back to staff names
            efficiencyStats = creativeStaff.map(staff => {
                var _a;
                const staffStats = rawStats.filter(s => s.assignee_id === staff.user_id);
                const total = staffStats.reduce((acc, curr) => acc + curr._count.id, 0);
                const completed = ((_a = staffStats.find(s => s.status === 'COMPLETED')) === null || _a === void 0 ? void 0 : _a._count.id) || 0;
                return {
                    name: staff.user.full_name,
                    total,
                    completed,
                    efficiency: total > 0 ? Math.round((completed / total) * 100) : 0
                };
            }).filter(s => s.total > 0); // Only show active staff
        }
    }
    else {
        // Personal Monthly Status
        const myTasks = yield prisma_1.default.task.findMany({
            where: {
                assignee_id: user.id,
                createdAt: { gte: startOfMonth }
            },
            select: { status: true }
        });
        efficiencyStats = [{
                name: 'Me',
                total: myTasks.length,
                completed: myTasks.filter(t => t.status === 'COMPLETED').length,
                efficiency: myTasks.length > 0 ? Math.round((myTasks.filter(t => t.status === 'COMPLETED').length / myTasks.length) * 100) : 0
            }];
    }
    return {
        distribution: statusDistribution,
        efficiency: efficiencyStats,
        isManagerial
    };
});
exports.getDashboardStats = getDashboardStats;
// ADMIN: Reset all task data
const wipeAllTaskData = () => __awaiter(void 0, void 0, void 0, function* () {
    // Delete in order to respect constraints
    yield prisma_1.default.timeLog.deleteMany({});
    yield prisma_1.default.comment.deleteMany({});
    // Disconnect assets from tasks (nullable) or delete if strictly bound?
    // Schema says Asset.task_id is optional. We'll just unlink them to be safe, 
    // OR user said "wipe out entire task related datas". 
    // Usually assets are valuable files. Let's just unlink them for now to avoid losing files.
    // Notifications: Often contain old task alerts. Wipe them for a fresh start.
    yield prisma_1.default.notification.deleteMany({});
    // Assets are strictly linked to tasks (required task_id).
    // Deleting all assets is safe as they are child records of Tasks.
    yield prisma_1.default.asset.deleteMany({});
    // 1. Break Self-Reference (Subtasks) to avoid Foreign Key locking
    yield prisma_1.default.task.updateMany({
        where: { parent_task_id: { not: null } },
        data: { parent_task_id: null }
    });
    // 2. Clear Dependencies (Many-to-Many link table)
    yield prisma_1.default.taskDependency.deleteMany({});
    // 3. now safe to delete Tasks
    return yield prisma_1.default.task.deleteMany({});
});
exports.wipeAllTaskData = wipeAllTaskData;
// DEVELOPER ADMIN: Clear only Active Tasks (Keep Completed)
const clearActiveTasks = () => __awaiter(void 0, void 0, void 0, function* () {
    // defined statuses to wipe
    const activeStatuses = ['PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'REVISION_REQUESTED'];
    // 1. Find tasks to be deleted
    const tasksToDelete = yield prisma_1.default.task.findMany({
        where: { status: { in: activeStatuses } },
        select: { id: true }
    });
    const ids = tasksToDelete.map(t => t.id);
    if (ids.length === 0)
        return { count: 0 };
    // 2. Cleanup Dependencies first to avoid FK errors
    // Delete TimeLogs
    yield prisma_1.default.timeLog.deleteMany({ where: { task_id: { in: ids } } });
    // Delete Comments
    yield prisma_1.default.comment.deleteMany({ where: { task_id: { in: ids } } });
    // Delete Assets
    yield prisma_1.default.asset.deleteMany({ where: { task_id: { in: ids } } });
    // Break Parent-Child Links (in case an active task is parent to a completed one? highly unlikely direction, but safe to set null)
    // Actually, if we delete the parent, the child's parent_id should be set to null.
    // Prisma SetNull on delete usually handles this if configured, but let's be manual.
    yield prisma_1.default.task.updateMany({
        where: { parent_task_id: { in: ids } },
        data: { parent_task_id: null }
    });
    // Clear Task Dependencies where these tasks are involved
    yield prisma_1.default.taskDependency.deleteMany({
        where: {
            OR: [
                { blocking_task_id: { in: ids } },
                { blocked_task_id: { in: ids } }
            ]
        }
    });
    // 3. Delete Notifications related to these tasks?
    // Notifications don't usually have a direct foreign key to Task in some schemas, or do they?
    // Looking at createNotification usage: `link` string.
    // We can't easily query notifications by link string safely. We'll skip notification cleanup for partial delete to avoid deleting unrelated stuff.
    // Unless schema has `task_id` on Notification. Assuming no for now based on snippet.
    // 4. Delete the Tasks
    const result = yield prisma_1.default.task.deleteMany({
        where: { id: { in: ids } }
    });
    return result;
});
exports.clearActiveTasks = clearActiveTasks;
// ULTRA-OPTIMIZED DASHBOARD AGGREGATION
const calculateDashboardAggregates = () => __awaiter(void 0, void 0, void 0, function* () {
    // Run all counts in parallel for maximum speed
    const [total, completed, inProgress, rework, overdue] = yield Promise.all([
        prisma_1.default.task.count(),
        prisma_1.default.task.count({ where: { status: 'COMPLETED' } }),
        prisma_1.default.task.count({ where: { status: 'IN_PROGRESS' } }),
        prisma_1.default.task.count({ where: { nature: 'REWORK' } }),
        prisma_1.default.task.count({
            where: {
                OR: [
                    { status: 'OVERDUE' },
                    { sla_status: 'BREACHED' },
                    {
                        status: { not: 'COMPLETED' },
                        due_date: { lt: new Date() }
                    }
                ]
            }
        })
    ]);
    return {
        total,
        completed,
        inProgress,
        rework,
        overdue
    };
});
exports.calculateDashboardAggregates = calculateDashboardAggregates;
