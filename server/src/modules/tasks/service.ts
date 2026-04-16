import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { createNotification } from '../notifications/service';
import SocketService from '../../socket';

// Helper to calculate SLA
const calculateSLA = (priority: string = 'MEDIUM'): Date => {
    const now = new Date();
    const hours = {
        'URGENT': 24,
        'HIGH': 48,
        'MEDIUM': 72,
        'LOW': 168 // 1 week
    }[priority] || 72;
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
};

export const createTask = async (data: Prisma.TaskCreateInput) => {
    const createData = { ...data };

    // 0. STRICT VALIDATION (Agency Master Prompt Phase 2)
    if (!createData.title) throw new Error("Task Title is required.");

    // Default Category & Nature if missing (Safety Net)
    // Cast to any to assume fields exist in new client
    if (!(createData as any).category) (createData as any).category = 'CAMPAIGN';
    if (!(createData as any).nature) (createData as any).nature = 'NEW';

    const isCampaignTask = (createData as any).category === 'CAMPAIGN';

    // Campaign is strictly required ONLY for Campaign Tasks.
    // MODIFIED: User requested removing Campaign Selector, so we relax this check.
    // Tasks can now be 'CAMPAIGN' category (client work) without a specific campaign_id.
    /*
    if (isCampaignTask && !createData.campaign?.connect?.id) {
        throw new Error("Campaign Task MUST be linked to a Campaign.");
    }
    */

    // 1. Hierarchy & Automation (Auto-Assign from Campaign)
    if (createData.campaign?.connect?.id) {
        const campaign = await prisma.campaign.findUnique({
            where: { id: createData.campaign.connect.id },
            select: { default_assignee_id: true, client_id: true }
        });

        if (campaign) {
            // If client link missing but campaign exists, link to campaign's client
            if (!createData.client?.connect?.id) {
                createData.client = { connect: { id: campaign.client_id } };
            }

            // Auto-Assign if missing
            if (!createData.assignee?.connect?.id && campaign.default_assignee_id) {
                createData.assignee = { connect: { id: campaign.default_assignee_id } };
            }
        }
    }

    // 2. SLA Calculation (If not provided manually)
    if (!createData.sla_target) {
        createData.sla_target = calculateSLA(createData.priority as string);
    }

    // 3. AI Estimation Stub (Random 30-180 mins for generic tasks)
    // Using 'any' cast to avoid TS error on new schema field if types aren't regenerated yet
    if (!(createData as any).ai_estimated_minutes) {
        (createData as any).ai_estimated_minutes = Math.floor(Math.random() * (180 - 30 + 1) + 30);
    }

    // 4. Set Initial SLA Status & Nature Default
    (createData as any).sla_status = 'ON_TRACK';

    // 5. Generate QIX Sequence ID
    const lastTask = await prisma.task.findFirst({
        orderBy: { sequence_id: 'desc' },
        select: { sequence_id: true }
    });
    const nextSequenceId = (lastTask?.sequence_id || 0) + 1;
    (createData as any).sequence_id = nextSequenceId;

    const task = await prisma.task.create({
        data: createData,
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true } },
            reporter: { select: { id: true, full_name: true, avatar_url: true } },
            assigned_by: { select: { id: true, full_name: true, avatar_url: true } }, // Ensure return
        }
    });

    try {
        if (task.assignee_id) {
            await createNotification(
                task.assignee_id,
                'TASK_ASSIGNED',
                `You have been assigned to task: ${task.title}`,
                `/dashboard/tasks/${task.id}`
            );
            // Real-time Push
            SocketService.emitToUser(task.assignee_id, 'task_created', task);
        }

        // Also emit to the reporter (creator) so their list updates instantly
        SocketService.emitToUser(task.reporter_id, 'task_created', task);
    } catch (e) {
        console.error("Notification Error (Create Task):", e);
    }

    return task;
};

export const getTasks = async (filters: {
    campaign_id?: string;
    assignee_id?: string;
    client_id?: string;
    status?: string;
    priority?: string;
    department?: string;
    campaign_type?: string;
    startDate?: Date;
    endDate?: Date;
}) => {
    let whereClause: Prisma.TaskWhereInput = {};

    if (filters?.campaign_id) whereClause.campaign_id = filters.campaign_id;
    if (filters?.client_id) whereClause.client_id = filters.client_id;
    if (filters?.assignee_id) whereClause.assignee_id = filters.assignee_id;
    if (filters?.status) whereClause.status = filters.status;
    if (filters?.priority) whereClause.priority = filters.priority;
    if (filters?.department) (whereClause as any).department = filters.department;
    if (filters?.campaign_type) (whereClause as any).campaign_type = filters.campaign_type;

    // Date Range Filtering (Mixed: Due Date OR Created At OR Start Date)
    if (filters.startDate && filters.endDate) {
        whereClause.OR = [
            { createdAt: { gte: filters.startDate, lte: filters.endDate } },
            { actual_start_date: { gte: filters.startDate, lte: filters.endDate } }
        ];
    } else if (!filters.status) {
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

    const isDashboardMode = (filters as any).dashboard === 'true';

    return await prisma.task.findMany({
        where: whereClause,
        include: isDashboardMode ? {
            client: { select: { name: true } },
            // We still need status and title obviously
        } : {
            assignee: { select: { id: true, full_name: true, avatar_url: true, department: true } },
            reporter: { select: { id: true, full_name: true, avatar_url: true } },
            campaign: { include: { client: true } },
            client: { select: { name: true } },
            assigned_by: { select: { id: true, full_name: true, avatar_url: true } },
            _count: { select: { comments: true, assets: true, sub_tasks: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const getTaskById = async (id: string) => {
    return await prisma.task.findUnique({
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
};

export const startTimer = async (taskId: string, userId: string) => {
    // Check if already running
    const activeLog = await prisma.timeLog.findFirst({
        where: { task_id: taskId, user_id: userId, end_time: null }
    });

    if (activeLog) return activeLog; // Already running

    return await prisma.timeLog.create({
        data: {
            task_id: taskId,
            user_id: userId,
            start_time: new Date()
        }
    });
};

export const stopTimer = async (taskId: string, userId: string) => {
    const activeLog = await prisma.timeLog.findFirst({
        where: { task_id: taskId, user_id: userId, end_time: null }
    });

    if (!activeLog) throw new Error("No active timer found");

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - activeLog.start_time.getTime()) / 60000); // Minutes

    return await prisma.timeLog.update({
        where: { id: activeLog.id },
        data: {
            end_time: endTime,
            duration_minutes: duration
        }
    });
};

export const updateTask = async (id: string, data: Prisma.TaskUpdateInput, userId?: string) => {
    // Automatic Timestamping Logic
    if (data.status) {
        if (data.status === 'IN_PROGRESS') {
            const current = await prisma.task.findUnique({ where: { id }, select: { actual_start_date: true } });
            if (!current?.actual_start_date) {
                data.actual_start_date = new Date();
            }
        }
        if (data.status === 'COMPLETED') {
            data.completed_date = new Date();
        }
        // REWORK: auto-sync nature field so analytics track it correctly
        if (data.status === 'REWORK') {
            (data as any).nature = 'REWORK';
            // Stop any running timer when task goes to rework
            await prisma.timeLog.updateMany({
                where: { task_id: id, end_time: null },
                data: { end_time: new Date() }
            }).catch(() => { });
        }
    }

    const existingTask = await prisma.task.findUnique({ where: { id } });

    const updatedTask = await prisma.task.update({
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
                const actor = await prisma.user.findUnique({ where: { id: userId }, select: { full_name: true } });
                const actorName = actor ? actor.full_name : 'System';

                // Create System Comment
                await prisma.comment.create({
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
                await createNotification(
                    updatedTask.assignee_id,
                    'TASK_ASSIGNED',
                    `You have been assigned to task: ${updatedTask.title}`,
                    `/dashboard/tasks/${updatedTask.id}`
                );
                SocketService.emitToUser(updatedTask.assignee_id, 'task_created', updatedTask); // Treat as new for them
            }

            // Notify reporter on status change
            if (updatedTask.status !== existingTask.status) {
                await createNotification(
                    updatedTask.reporter_id,
                    'TASK_UPDATED',
                    `Task "${updatedTask.title}" is now ${updatedTask.status}`,
                    `/dashboard/tasks/${updatedTask.id}`
                );
            }

            // General Update Broadcast
            // Emit to assignee and reporter
            if (updatedTask.assignee_id) SocketService.emitToUser(updatedTask.assignee_id, 'task_updated', updatedTask);
            SocketService.emitToUser(updatedTask.reporter_id, 'task_updated', updatedTask);
        }
    } catch (e) {
        console.error("Notification Error (Update Task):", e);
    }

    return updatedTask;
};

export const deleteTask = async (id: string) => {
    // Break Parent-Child relation before delete (Simulate SetNull)
    await prisma.task.updateMany({
        where: { parent_task_id: id },
        data: { parent_task_id: null }
    });

    return await prisma.task.delete({
        where: { id }
    });
};

export const getTaskStats = async (filters: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'staff' | 'department' | 'status' | 'client' | 'staff_type';
    department?: string;
}) => {
    const whereClause: Prisma.TaskWhereInput = {};

    // Synchronized Period Logic:
    // Include tasks that were ACTIVE or COMPLETED during this period.
    if (filters.startDate && filters.endDate) {
        whereClause.AND = [
            { createdAt: { lte: filters.endDate } }, // Created before or during period
            {
                OR: [
                    { completed_date: null }, // Still active (not completed yet)
                    { completed_date: { gte: filters.startDate } }, // Completed during or after this period
                    {
                        AND: [
                            { completed_date: null },
                            { status: 'COMPLETED' },
                            { updatedAt: { gte: filters.startDate } }
                        ]
                    } // Fallback for legacy completed tasks without completed_date
                ]
            }
        ];
    }

    if (filters.department) {
        whereClause.department = filters.department;
    }

    // Fetch all relevant tasks with assignee info
    const tasks = await prisma.task.findMany({
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
            due_date: true,
            completed_date: true,
            updatedAt: true,
            type: true
        }
    });

    // Aggregation Logic
    const stats: Record<string, { total: number; completed: number; pending: number; overdue: number }> = {};

    tasks.forEach(task => {
        let key = 'Unassigned';

        if (filters.groupBy === 'staff') {
            key = task.assignee?.full_name || 'Unassigned';
        } else if (filters.groupBy === 'department') {
            key = task.assignee?.department || 'Unassigned';
        } else if (filters.groupBy === 'client') {
            key = task.client?.name || 'No Client';
        } else if (filters.groupBy === 'status') {
            key = task.status;
        } else if (filters.groupBy === 'staff_type') {
            const staffName = task.assignee?.full_name || 'Unassigned';
            key = `${staffName} - ${task.type}`;
        }

        if (!stats[key]) {
            stats[key] = { total: 0, completed: 0, pending: 0, overdue: 0 };
        }

        stats[key].total++;

        // Strict Period Completion Check
        const compDate = task.completed_date || (task.status === 'COMPLETED' ? task.updatedAt : null);
        const isCompletedInPeriod = compDate &&
            filters.startDate && filters.endDate &&
            compDate >= filters.startDate &&
            compDate <= filters.endDate;

        if (isCompletedInPeriod) {
            stats[key].completed++;
        } else {
            stats[key].pending++;
            // Check Overdue: If Task is not completed AND due_date < now
            if (task.due_date && new Date(task.due_date) < new Date()) {
                stats[key].overdue++;
            }
        }
    });

    // Convert to Array
    return Object.entries(stats).map(([key, value]) => ({
        name: key,
        ...value,
        rate: value.total > 0 ? Math.round((value.completed / value.total) * 100) : 0
    }));
};

export const getDashboardStats = async (user: { id: string, role: string, department: string }) => {
    // 1. Determine Scope
    // Including MARKETING_EXEC in managerial view as per previous logic
    const isManagerial = ['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN', 'MARKETING_EXEC', 'WEB_SEO_EXECUTIVE'].includes(user.role) || user.department === 'MARKETING' || user.department === 'WEB';

    // 2. Task Status Distribution
    const distributionWhere: Prisma.TaskWhereInput = isManagerial ? {} : { assignee_id: user.id };

    const statusRaw = await prisma.task.groupBy({
        by: ['status'],
        where: distributionWhere,
        _count: { id: true }
    });

    const statusDistribution = statusRaw.map(s => ({ name: s.status, value: s._count.id }));

    // 3. Efficiency Stats (Optimized)
    let efficiencyStats: { name: string; total: number; completed: number; efficiency: number }[] = [];

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    if (isManagerial) {
        // Creative Team Efficiency (All staff in CREATIVE department)
        // Fetch all tasks for creative staff in one go, grouped by assignee
        // First get creative staff IDs to filter
        const creativeStaff = await prisma.staffProfile.findMany({
            where: { department: 'CREATIVE', user: { status: 'ACTIVE' } },
            select: { user_id: true, user: { select: { full_name: true } } }
        });

        const creativeIds = creativeStaff.map(s => s.user_id);

        if (creativeIds.length > 0) {
            // Group by assignee and status
            const rawStats = await prisma.task.groupBy({
                by: ['assignee_id', 'status'],
                where: {
                    assignee_id: { in: creativeIds },
                    createdAt: { gte: startOfMonth }
                },
                _count: { id: true }
            });

            // Map results back to staff names
            efficiencyStats = creativeStaff.map(staff => {
                const staffStats = rawStats.filter(s => s.assignee_id === staff.user_id);
                const total = staffStats.reduce((acc, curr) => acc + curr._count.id, 0);
                const completed = staffStats.find(s => s.status === 'COMPLETED')?._count.id || 0;

                return {
                    name: staff.user.full_name,
                    total,
                    completed,
                    efficiency: total > 0 ? Math.round((completed / total) * 100) : 0
                };
            }).filter(s => s.total > 0); // Only show active staff
        }

    } else {
        // Personal Monthly Status
        const myTasks = await prisma.task.findMany({
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
};

// ADMIN: Reset all task data
export const wipeAllTaskData = async () => {
    // Delete in order to respect constraints
    await prisma.timeLog.deleteMany({});
    await prisma.comment.deleteMany({});

    // Disconnect assets from tasks (nullable) or delete if strictly bound?
    // Schema says Asset.task_id is optional. We'll just unlink them to be safe, 
    // OR user said "wipe out entire task related datas". 
    // Usually assets are valuable files. Let's just unlink them for now to avoid losing files.
    // Notifications: Often contain old task alerts. Wipe them for a fresh start.
    await prisma.notification.deleteMany({});

    // Assets are strictly linked to tasks (required task_id).
    // Deleting all assets is safe as they are child records of Tasks.
    await prisma.asset.deleteMany({});

    // 1. Break Self-Reference (Subtasks) to avoid Foreign Key locking
    await prisma.task.updateMany({
        where: { parent_task_id: { not: null } },
        data: { parent_task_id: null }
    });

    // 2. Clear Dependencies (Many-to-Many link table)
    await prisma.taskDependency.deleteMany({});

    // 3. now safe to delete Tasks
    return await prisma.task.deleteMany({});
};

// DEVELOPER ADMIN: Clear only Active Tasks (Keep Completed)
export const clearActiveTasks = async () => {
    // defined statuses to wipe
    const activeStatuses = ['PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'REVISION_REQUESTED'];

    // 1. Find tasks to be deleted
    const tasksToDelete = await prisma.task.findMany({
        where: { status: { in: activeStatuses } },
        select: { id: true }
    });

    const ids = tasksToDelete.map(t => t.id);

    if (ids.length === 0) return { count: 0 };

    // 2. Cleanup Dependencies first to avoid FK errors
    // Delete TimeLogs
    await prisma.timeLog.deleteMany({ where: { task_id: { in: ids } } });

    // Delete Comments
    await prisma.comment.deleteMany({ where: { task_id: { in: ids } } });

    // Delete Assets
    await prisma.asset.deleteMany({ where: { task_id: { in: ids } } });

    // Break Parent-Child Links (in case an active task is parent to a completed one? highly unlikely direction, but safe to set null)
    // Actually, if we delete the parent, the child's parent_id should be set to null.
    // Prisma SetNull on delete usually handles this if configured, but let's be manual.
    await prisma.task.updateMany({
        where: { parent_task_id: { in: ids } },
        data: { parent_task_id: null }
    });

    // Clear Task Dependencies where these tasks are involved
    await prisma.taskDependency.deleteMany({
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
    const result = await prisma.task.deleteMany({
        where: { id: { in: ids } }
    });

    return result;
};
// ULTRA-OPTIMIZED DASHBOARD AGGREGATION
export const calculateDashboardAggregates = async () => {
    // Run all counts in parallel for maximum speed
    const [total, completed, inProgress, rework, overdue] = await Promise.all([
        prisma.task.count(),
        prisma.task.count({ where: { status: 'COMPLETED' } }),
        prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.task.count({ where: { nature: 'REWORK' } }),
        prisma.task.count({
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
};

export const getDigitalMarketingDashboardStats = async (month?: number, year?: number) => {
    // Determine the date range for the selected month/year
    const now = new Date();
    const targetMonth = month !== undefined ? month : now.getMonth();
    const targetYear = year !== undefined ? year : now.getFullYear();

    const startOfPeriod = new Date(targetYear, targetMonth, 1);
    const endOfPeriod = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    console.log(`[DM-Stats] Calculating for Month: ${targetMonth}, Year: ${targetYear}`);
    console.log(`[DM-Stats] Period: ${startOfPeriod.toISOString()} to ${endOfPeriod.toISOString()}`);

    const periodFilter = {
        createdAt: {
            gte: startOfPeriod,
            lte: endOfPeriod
        }
    };

    // 1. Total Active Clients (Snapshot of current status)
    const activeClients = await prisma.client.count({
        where: { status: 'ACTIVE' }
    });

    // 2. Active Meta Campaigns (Unique campaigns active in the period)
    const activeMetaLogs = await prisma.metaAdsLog.findMany({
        where: {
            status: 'ACTIVE',
            ...periodFilter
        },
        select: { campaign_name: true }
    });
    const uniqueMetaCampaigns = new Set(activeMetaLogs.map(l => l.campaign_name));
    const activeMetaCampaigns = uniqueMetaCampaigns.size;

    // 3. Assigned Creative Tasks (Total non-completed Creative Tasks currently in system)
    const assignedCreativeTasks = await prisma.task.count({
        where: {
            department: 'CREATIVE',
            status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
    });

    // 4. Completed Creative Tasks (Tasks completed WITHIN this month)
    const completedCreativeTasks = await prisma.task.count({
        where: {
            department: 'CREATIVE',
            status: 'COMPLETED',
            OR: [
                {
                    completed_date: {
                        gte: startOfPeriod,
                        lte: endOfPeriod
                    }
                },
                {
                    // Fallback to createdAt if completed_date is missing for some reason
                    AND: [
                        { completed_date: null },
                        {
                            createdAt: {
                                gte: startOfPeriod,
                                lte: endOfPeriod
                            }
                        }
                    ]
                }
            ]
        }
    });

    // 5. Pending Creative Tasks (Backlog: Not completed AND (Due Date is past OR Status is delayed))
    const pendingCreativeTasks = await prisma.task.count({
        where: {
            department: 'CREATIVE',
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
            OR: [
                { due_date: { lt: now } },
                { status: { in: ['REVISION', 'REWORK', 'OVERDUE'] } }
            ]
        }
    });

    // 6. Charts Data (Focused on Digital Marketing department only)
    const allDMTasks = await prisma.task.findMany({
        where: {
            department: 'DIGITAL_MARKETING',
            ...periodFilter
        },
        select: { campaign_type: true }
    });
    const campaignTypeStatsObj: Record<string, number> = {};
    allDMTasks.forEach(task => {
        const type = task.campaign_type || 'Other';
        campaignTypeStatsObj[type] = (campaignTypeStatsObj[type] || 0) + 1;
    });
    const campaignTypeStats = Object.entries(campaignTypeStatsObj).map(([name, value]) => ({ name, value }));

    const statusStatsRaw = await prisma.task.groupBy({
        by: ['status'],
        where: {
            department: 'DIGITAL_MARKETING',
            ...periodFilter
        },
        _count: { id: true }
    });
    const statusStats = statusStatsRaw.map(s => ({ name: s.status, value: s._count.id }));

    const staffTasksRaw = await prisma.task.groupBy({
        by: ['assignee_id'],
        where: {
            department: 'DIGITAL_MARKETING',
            assignee_id: { not: null },
            ...periodFilter
        },
        _count: { id: true }
    });
    const staffIds = staffTasksRaw.map(s => s.assignee_id!).filter(Boolean);
    const staffMembers = await prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, full_name: true } });
    const staffStats = staffTasksRaw.map(s => ({
        name: staffMembers.find(m => m.id === s.assignee_id)?.full_name || 'Unknown',
        value: s._count.id
    }));

    console.log(`[DM-Stats] Results: Clients=${activeClients}, Meta=${activeMetaCampaigns}, Assigned=${assignedCreativeTasks}, Completed=${completedCreativeTasks}, Pending=${pendingCreativeTasks}`);

    console.log(`[DM-Stats] Results: Clients=${activeClients}, Meta=${activeMetaCampaigns}, Assigned=${assignedCreativeTasks}, Completed=${completedCreativeTasks}, Pending=${pendingCreativeTasks}`);

    return {
        activeClients,
        activeMetaCampaigns,
        assignedCreativeTasks,
        completedCreativeTasks,
        pendingCreativeTasks,
        charts: {
            campaignTypeStats,
            staffStats,
            statusStats
        }
    };
};

export const generateContentTasks = async (clientId: string, userId: string) => {
    const strategies = await prisma.clientContentStrategy.findMany({
        where: { client_id: clientId },
        include: { content_type: true, client: true }
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthStr = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    let createdCount = 0;

    for (const strat of strategies) {
        if (!strat.content_type || !strat.content_type_id || strat.monthly_target <= 0) continue;

        const currentTasksCount = await prisma.task.count({
            where: {
                client_id: clientId,
                content_type_id: strat.content_type_id,
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        const tasksToGenerate = strat.monthly_target - currentTasksCount;

        if (tasksToGenerate > 0) {
            const lastTask = await prisma.task.findFirst({
                orderBy: { sequence_id: 'desc' },
                select: { sequence_id: true }
            });
            let nextSequenceId = (lastTask?.sequence_id || 0) + 1;

            const bulkData = Array.from({ length: tasksToGenerate }).map((_, i) => ({
                title: `${strat.client.name} - ${strat.content_type!.name} - ${monthStr} #${currentTasksCount + i + 1}`,
                client_id: clientId,
                content_type_id: strat.content_type_id!,
                status: 'PLANNED',
                priority: 'MEDIUM',
                type: 'GRAPHIC',
                department: 'CREATIVE',
                category: 'CAMPAIGN',
                nature: 'NEW',
                reporter_id: userId,
                assigned_by_id: userId,
                sequence_id: nextSequenceId++,
                sla_status: 'ON_TRACK',
            }));

            await prisma.task.createMany({
                data: bulkData as any[]
            });

            createdCount += tasksToGenerate;
        }
    }

    return { createdCount };
};


