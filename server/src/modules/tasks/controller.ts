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
    nature: z.string().optional(),    // Added
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
        if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
        if (isCreative(req)) return res.status(403).json({ message: 'Creative team cannot create tasks.' });

        const validatedData = createTaskSchema.parse(req.body);

        const { assignee_id, campaign_id, client_id, due_date, ...otherData } = validatedData;

        const task = await taskService.createTask({
            ...otherData,
            reporter: { connect: { id: req.user.id } },
            ...(assignee_id ? { assignee: { connect: { id: assignee_id } } } : {}),
            ...(campaign_id ? { campaign: { connect: { id: campaign_id } } } : {}),
            ...(client_id ? { client: { connect: { id: client_id } } } : {}),
            due_date: due_date ? new Date(due_date) : undefined,
        });

        res.status(201).json(task);
    } catch (error: any) {
        if (error instanceof z.ZodError) res.status(400).json({ errors: error.errors });
        else res.status(500).json({ message: error.message });
    }
};

export const getTasks = async (req: Request, res: Response) => {
    try {
        const { campaign_id, assignee_id, status, priority } = req.query;

        const tasks = await taskService.getTasks({
            campaign_id: campaign_id as string,
            assignee_id: assignee_id as string,
            status: status as any,
            priority: priority as any,
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
        if (isCreative(req)) {
            // Exception: Creative team MIGHT need to update status of their OWN task?
            // User said: "Except 'creative' team all other staffs can create, modify, and delete the task to others."
            // This implies Creative team CANNOT do general modifications.
            // Checking if they are just updating status? 
            // "modify... the task" usually covers everything. 
            // Safest interpretation: Block all modifications as per strict request.
            // If user complains they can't update status, I will relax it later.
            return res.status(403).json({ message: 'Creative team cannot modify tasks.' });
        }

        const validatedData = updateTaskSchema.parse(req.body);

        // Transform relations to Prisma Connect syntax
        const { assignee_id, campaign_id, client_id, due_date, ...rest } = validatedData;
        const updateData: any = { ...rest };

        if (assignee_id) updateData.assignee = { connect: { id: assignee_id } };
        if (campaign_id) updateData.campaign = { connect: { id: campaign_id } };
        if (client_id) updateData.client = { connect: { id: client_id } };
        if (due_date) updateData.due_date = new Date(due_date);

        const task = await taskService.updateTask(req.params.id, updateData);

        res.json(task);
    } catch (error: any) {
        if (error instanceof z.ZodError) res.status(400).json({ errors: error.errors });
        else res.status(500).json({ message: error.message });
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    try {
        if (isCreative(req)) return res.status(403).json({ message: 'Creative team cannot delete tasks.' });

        await taskService.deleteTask(req.params.id);
        res.json({ message: 'Task deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
