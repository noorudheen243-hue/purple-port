
import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

export const createNote = async (userId: string, data: { title?: string, color?: string, position_x?: number, position_y?: number }) => {
    // Check limit? Maybe limit to 20 active notes to prevent spam.
    const count = await prisma.stickyNote.count({ where: { user_id: userId, is_visible: true } });
    if (count > 50) throw new Error("Sticky Note limit reached. Please archive or delete old notes.");

    return await prisma.stickyNote.create({
        data: {
            user: { connect: { id: userId } },
            title: data.title || "New Note",
            color: data.color || "#feff9c",
            position_x: data.position_x ?? 50, // Default handled by DB usually, or here
            position_y: data.position_y ?? 50,
        },
        include: { tasks: true, permissions: true }
    });
};

export const getNotes = async (userId: string) => {
    // Fetch owned notes OR shared notes
    return await prisma.stickyNote.findMany({
        where: {
            OR: [
                { user_id: userId },
                { permissions: { some: { user_id: userId } } }
            ]
        },
        include: {
            tasks: { orderBy: { createdAt: 'asc' } },
            permissions: { include: { user: { select: { id: true, full_name: true, avatar_url: true } } } },
            user: { select: { id: true, full_name: true } } // Owner info
        },
        orderBy: { createdAt: 'asc' }
    });
};

export const updateNote = async (noteId: string, userId: string, data: Prisma.StickyNoteUpdateInput) => {
    // Check permission
    const note = await prisma.stickyNote.findUnique({ where: { id: noteId }, include: { permissions: true } });
    if (!note) throw new Error("Note not found");

    const isOwner = note.user_id === userId;
    const isEditor = note.permissions.some(p => p.user_id === userId && p.role === 'EDITOR');

    if (!isOwner && !isEditor) throw new Error("Permission denied");

    return await prisma.stickyNote.update({
        where: { id: noteId },
        data,
        include: { tasks: true }
    });
};

export const deleteNote = async (noteId: string, userId: string) => {
    const note = await prisma.stickyNote.findUnique({ where: { id: noteId } });
    if (!note) throw new Error("Note not found");

    if (note.user_id !== userId) throw new Error("Only the owner can delete a note");

    return await prisma.stickyNote.delete({ where: { id: noteId } });
};

// --- TASKS ---

export const addTask = async (userId: string, noteId: string, content: string) => {
    // Check permission (Owner or Editor)
    const note = await prisma.stickyNote.findUnique({ where: { id: noteId }, include: { permissions: true } });
    if (!note) throw new Error("Note not found");

    const canEdit = note.user_id === userId || note.permissions.some(p => p.user_id === userId && p.role === 'EDITOR');
    if (!canEdit) throw new Error("Permission denied");

    return await prisma.stickyTask.create({
        data: {
            content,
            note: { connect: { id: noteId } }
        }
    });
};

export const updateTask = async (userId: string, taskId: string, data: { content?: string, is_completed?: boolean }) => {
    const task = await prisma.stickyTask.findUnique({ where: { id: taskId }, include: { note: { include: { permissions: true } } } });
    if (!task) throw new Error("Task not found");

    const canEdit = task.note.user_id === userId || task.note.permissions.some(p => p.user_id === userId && p.role === 'EDITOR');
    if (!canEdit) throw new Error("Permission denied");

    const updateData: any = { ...data };
    if (data.is_completed !== undefined) {
        updateData.completed_at = data.is_completed ? new Date() : null;
    }

    return await prisma.stickyTask.update({
        where: { id: taskId },
        data: updateData
    });
};

export const deleteTask = async (userId: string, taskId: string) => {
    const task = await prisma.stickyTask.findUnique({ where: { id: taskId }, include: { note: { include: { permissions: true } } } });
    if (!task) throw new Error("Task not found");

    const canEdit = task.note.user_id === userId || task.note.permissions.some(p => p.user_id === userId && p.role === 'EDITOR');
    if (!canEdit) throw new Error("Permission denied");

    return await prisma.stickyTask.delete({ where: { id: taskId } });
};

// --- SHARING ---

export const shareNote = async (ownerId: string, noteId: string, targetUserId: string, role: 'EDITOR' | 'VIEWER') => {
    const note = await prisma.stickyNote.findUnique({ where: { id: noteId } });
    if (!note || note.user_id !== ownerId) throw new Error("Permission denied");

    if (ownerId === targetUserId) throw new Error("Cannot share with yourself");

    // Upsert permission
    return await prisma.stickyNotePermission.upsert({
        where: { note_id_user_id: { note_id: noteId, user_id: targetUserId } },
        create: {
            note_id: noteId,
            user_id: targetUserId,
            role
        },
        update: {
            role
        }
    });
};

export const removeShare = async (ownerId: string, noteId: string, targetUserId: string) => {
    const note = await prisma.stickyNote.findUnique({ where: { id: noteId } });
    if (!note || note.user_id !== ownerId) throw new Error("Permission denied");

    return await prisma.stickyNotePermission.delete({
        where: { note_id_user_id: { note_id: noteId, user_id: targetUserId } }
    });
};
