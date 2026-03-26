import { Request, Response } from 'express';
import prisma from '../../utils/prisma';
import * as taskService from './service';

export const debugTasks = async (req: Request, res: Response) => {
    try {
        const allTasksCount = await prisma.task.count();
        const first5Tasks = await prisma.task.findMany({
            take: 5,
            include: { assignee: true }
        });

        // Test the service function with empty filters
        const serviceTasks = await taskService.getTasks({});

        res.json({
            debug_info: "Task Debugger",
            total_tasks_in_db: allTasksCount,
            sample_tasks: first5Tasks,
            service_get_tasks_result_count: serviceTasks.length,
            service_sample: serviceTasks.slice(0, 2)
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
};
