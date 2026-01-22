import { Request, Response } from 'express';
import { z } from 'zod';
import * as taskService from './service';

const createTaskSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    campaign_id: z.string().optional(),
    assignee_id: z.string().optional(),
    client_id: z.string().optional(), // Added
    category: z.string().optional(),  // Added
    content_type: z.string().optional(), // Added: Link to Client Content Strategy
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    type: z.enum([
        'GRAPHIC', 'VIDEO', 'MOTION', 'BRANDING', 'CONTENT_CREATION',
        'CONTENT_SHOOTING', 'WEB_DEV', 'REEL_EDITING', 'SEO', 'ADS_SETUP', 'REPORTING', 'GENERIC',
        'CONTENT', 'WEB'
    ]).default('GENERIC'),
    due_date: z.string().optional(),
    estimated_hours: z.number().optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
    status: z.enum(['PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'REVISION_REQUESTED', 'COMPLETED']).optional(),
});

const isCreative = (req: Request) => req.user?.department === 'CREATIVE';

export const createTask = async (req: Request, res: Response) => {
    try {
        console.log("Create Task Payload:", JSON.stringify(req.body, null, 2)); // DEBUG LOG

        if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
        // Removed isCreative check to allow Creative team to create tasks as per new requirements
        // if (isCreative(req)) return res.status(403).json({ message: 'Creative team cannot create tasks.' });

        const validatedData = createTaskSchema.parse(req.body);

        const { assignee_id, campaign_id, client_id, due_date, ...otherData } = validatedData;

        const task = await taskService.createTask({
            ...otherData,
            reporter: { connect: { id: req.user.id } },
            assigned_by: { connect: { id: req.user.id } }, // Added Correctly
            ...(assignee_id ? { assignee: { connect: { id: assignee_id } } } : {}),
            ...(campaign_id ? { campaign: { connect: { id: campaign_id } } } : {}),
            ...(client_id ? { client: { connect: { id: client_id } } } : {}),
            due_date: due_date ? new Date(due_date) : undefined,
        });

        res.status(201).json(task);
    } catch (error: any) {
        console.error("Task Creation Error:", error); // DEBUG LOG
        if (error instanceof z.ZodError) res.status(400).json({ errors: error.errors });
        else res.status(500).json({ message: error.message });
    }
};

export const getTasks = async (req: Request, res: Response) => {
    try {
        const { campaign_id, assignee_id, client_id, status, priority, start_date, end_date } = req.query;

        const tasks = await taskService.getTasks({
            campaign_id: campaign_id as string,
            client_id: client_id as string,
            assignee_id: assignee_id as string,
            status: status as any,
            priority: priority as any,
            startDate: start_date ? new Date(start_date as string) : undefined,
            endDate: end_date ? new Date(end_date as string) : undefined
        });

        res.json(tasks);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTask = async (req: Request, res: Response) => {
    try {
        const task = await taskService.getTaskById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    try {
        console.log("---------------- START UPDATE TASK DEBUG ----------------");
        console.log("User:", JSON.stringify(req.user, null, 2));
        console.log("Raw Body:", JSON.stringify(req.body, null, 2));

        const validatedData = updateTaskSchema.parse(req.body);
        console.log("Validated Data:", JSON.stringify(validatedData, null, 2));

        // Transform relations to Prisma Connect syntax
        const { assignee_id, campaign_id, client_id, due_date, ...rest } = validatedData;
        let updateData: any = { ...rest };

        // Access Control: Removed Creative Team Restriction
        // All roles authorized in routes can update tasks fully
        if (assignee_id) updateData.assignee = { connect: { id: assignee_id } };
        if (campaign_id) updateData.campaign = { connect: { id: campaign_id } };
        if (client_id) updateData.client = { connect: { id: client_id } };
        if (due_date) updateData.due_date = new Date(due_date);

        console.log("Final Update Payload sent to Service:", JSON.stringify(updateData, null, 2));
        const task = await taskService.updateTask(req.params.id, updateData);
        console.log("Task Updated Successfully");

        res.json(task);
    } catch (error: any) {
        console.error("UPDATE TASK ERROR:", error);
        if (error instanceof z.ZodError) res.status(400).json({ errors: error.errors });
        else res.status(500).json({ message: error.message });
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    try {

        await taskService.deleteTask(req.params.id);
        res.json({ message: 'Task deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const startTaskTimer = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
        const timer = await taskService.startTimer(req.params.id, req.user.id);
        res.json(timer);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const stopTaskTimer = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
        const timer = await taskService.stopTimer(req.params.id, req.user.id);
        res.json(timer);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStats = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const { view, start, end } = req.query;

        // If 'view' matches report types, fetch Report Stats (Array)
        if (view && ['staff', 'department', 'client', 'status'].includes(view as string)) {
            const reportStats = await taskService.getTaskStats({
                groupBy: view as 'staff' | 'department' | 'client' | 'status',
                startDate: start ? new Date(start as string) : undefined,
                endDate: end ? new Date(end as string) : undefined
            });
            return res.json(reportStats);
        }

        // OPTIMIZED DASHBOARD AGGREGATES
        if (view === 'aggregates') {
            const aggs = await taskService.calculateDashboardAggregates();
            return res.json(aggs);
        }

        // Default: Dashboard Stats (Object)
        const stats = await taskService.getDashboardStats({
            id: req.user.id,
            role: req.user.role,
            department: req.user.department
        });

        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const resetData = async (req: Request, res: Response) => {
    try {
        console.log('RESET DATA REQUESTED');
        await taskService.wipeAllTaskData();
        res.json({ message: "All task data wiped successfully." });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
