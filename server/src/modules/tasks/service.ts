import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { createNotification } from '../notifications/service';

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
    if (isCampaignTask && !createData.campaign?.connect?.id) {
        throw new Error("Campaign Task MUST be linked to a Campaign.");
    }

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

    const task = await prisma.task.create({
        data: createData,
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true } },
            reporter: { select: { id: true, full_name: true, avatar_url: true } },
        }
    });

    if (task.assignee_id) {
        await createNotification(
            task.assignee_id,
            'TASK_ASSIGNED',
            `You have been assigned to task: ${task.title}`,
            `/dashboard/tasks/${task.id}`
        );
    }

    return task;
};

export const getTasks = async (filters: {
    campaign_id?: string;
    assignee_id?: string;
    status?: string;
    priority?: string;
}) => {
    const whereClause: Prisma.TaskWhereInput = {};

    if (filters.campaign_id) whereClause.campaign_id = filters.campaign_id;
    if (filters.assignee_id) whereClause.assignee_id = filters.assignee_id;
    if (filters.status) whereClause.status = filters.status;
    if (filters.priority) whereClause.priority = filters.priority;

    return await prisma.task.findMany({
        where: whereClause,
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true } },
            reporter: { select: { id: true, full_name: true, avatar_url: true } },
            campaign: { include: { client: true } }, // Include Client for display
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
            campaign: { include: { client: true } },
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
            }
        }
    });
};

export const updateTask = async (id: string, data: Prisma.TaskUpdateInput) => {
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
    }

    const existingTask = await prisma.task.findUnique({ where: { id } });

    const updatedTask = await prisma.task.update({
        where: { id },
        data,
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true } },
        }
    });

    if (existingTask) {
        // Notify new assignee
        if (updatedTask.assignee_id && updatedTask.assignee_id !== existingTask.assignee_id) {
            await createNotification(
                updatedTask.assignee_id,
                'TASK_ASSIGNED',
                `You have been assigned to task: ${updatedTask.title}`,
                `/dashboard/tasks/${updatedTask.id}`
            );
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
    }

    return updatedTask;
};

export const deleteTask = async (id: string) => {
    return await prisma.task.delete({
        where: { id }
    });
};
