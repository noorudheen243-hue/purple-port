import { Request, Response } from 'express';
import { z } from 'zod';
import * as commentService from './service';

const createCommentSchema = z.object({
    content: z.string().min(1),
    task_id: z.string().uuid(),
    parent_comment_id: z.string().uuid().optional(),
    is_revision_request: z.boolean().default(false),
});

export const createComment = async (req: Request, res: Response) => {
    try {
        const validatedData = createCommentSchema.parse(req.body);

        const comment = await commentService.createComment({
            content: validatedData.content,
            is_revision_request: validatedData.is_revision_request,
            task: { connect: { id: validatedData.task_id } },
            author: { connect: { id: req.user!.id } },
            ...(validatedData.parent_comment_id ? { parent_comment: { connect: { id: validatedData.parent_comment_id } } } : {})
        });

        res.status(201).json(comment);
    } catch (error: any) {
        if (error instanceof z.ZodError) res.status(400).json({ errors: error.errors });
        else res.status(500).json({ message: error.message });
    }
};

export const getComments = async (req: Request, res: Response) => {
    try {
        const { task_id } = req.query;
        if (!task_id) return res.status(400).json({ message: 'task_id is required' });

        const comments = await commentService.getCommentsByTask(task_id as string);
        res.json(comments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
