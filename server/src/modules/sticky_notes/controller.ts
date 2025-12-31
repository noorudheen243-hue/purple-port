
import { Request, Response } from 'express';
import * as StickyService from './service';
import { z } from 'zod';

const createNoteSchema = z.object({
    title: z.string().optional(),
    color: z.string().optional()
});

const updateNoteSchema = z.object({
    title: z.string().optional(),
    color: z.string().optional(),
    position_x: z.number().optional(),
    position_y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    is_minimized: z.boolean().optional(),
    is_visible: z.boolean().optional()
});

export const getNotes = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const notes = await StickyService.getNotes(userId);
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createNote = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const data = createNoteSchema.parse(req.body);
        const note = await StickyService.createNote(userId, data);
        res.status(201).json(note);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updateNote = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { id } = req.params;
        const data = updateNoteSchema.parse(req.body);
        const note = await StickyService.updateNote(id, userId, data);
        res.json(note);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const deleteNote = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { id } = req.params;
        await StickyService.deleteNote(id, userId);
        res.json({ message: "Note deleted" });
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const addTask = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { noteId } = req.params;
        const { content } = req.body;
        if (!content) throw new Error("Content is required");

        const task = await StickyService.addTask(userId, noteId, content);
        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { taskId } = req.params;
        const task = await StickyService.updateTask(userId, taskId, req.body);
        res.json(task);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { taskId } = req.params;
        await StickyService.deleteTask(userId, taskId);
        res.json({ message: "Task deleted" });
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const shareNote = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { id } = req.params;
        const { targetUserId, role } = req.body;
        const result = await StickyService.shareNote(userId, id, targetUserId, role);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const removeShare = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { id } = req.params;
        const { targetUserId } = req.body;
        await StickyService.removeShare(userId, id, targetUserId);
        res.json({ message: "Share removed" });
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};
