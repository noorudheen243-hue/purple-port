import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

export const createComment = async (data: Prisma.CommentCreateInput) => {
    // Transaction to create comment and potentially update task status
    return await prisma.$transaction(async (tx) => {
        const comment = await tx.comment.create({
            data,
            include: {
                author: { select: { id: true, full_name: true, avatar_url: true } }
            }
        });

        if (comment.is_revision_request) {
            await tx.task.update({
                where: { id: comment.task_id },
                data: { status: 'REVISION_REQUESTED' }
            });
        }

        return comment;
    });
};

export const getCommentsByTask = async (taskId: string) => {
    return await prisma.comment.findMany({
        where: { task_id: taskId },
        orderBy: { createdAt: 'asc' }, // Chronological
        include: {
            author: { select: { id: true, full_name: true, avatar_url: true } },
            replies: {
                include: {
                    author: { select: { id: true, full_name: true, avatar_url: true } }
                }
            }
        }
    });
};
