import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ClearTasksResult {
    success: boolean;
    deletedCounts: {
        taskDependencies: number;
        assets: number;
        comments: number;
        timeLogs: number;
        notifications: number;
        tasks: number;
    };
    message: string;
}

/**
 * Clear all tasks and related data from the system
 * This is a destructive operation that cannot be undone
 * Should only be called by DEVELOPER_ADMIN role
 */
export async function clearAllTasks(userId: string): Promise<ClearTasksResult> {
    try {
        // Use a transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Delete TaskDependencies first (references tasks)
            const deletedDependencies = await tx.taskDependency.deleteMany({});

            // 2. Delete Assets (references tasks)
            const deletedAssets = await tx.asset.deleteMany({});

            // 3. Delete Comments (references tasks, has self-referencing for replies)
            // Delete in reverse order: replies first, then parent comments
            const deletedComments = await tx.comment.deleteMany({});

            // 4. Delete TimeLogs (references tasks)
            const deletedTimeLogs = await tx.timeLog.deleteMany({});

            // 5. Delete task-related notifications
            // Filter by type to only delete task-related ones
            const deletedNotifications = await tx.notification.deleteMany({
                where: {
                    OR: [
                        { type: 'TASK_ASSIGNED' },
                        { type: 'TASK_UPDATED' },
                        { type: 'TASK_COMPLETED' },
                        { type: 'TASK_OVERDUE' },
                        { type: 'TASK_COMMENT' },
                        { type: 'TASK_MENTION' },
                        { link: { contains: '/tasks/' } }
                    ]
                }
            });

            // 6. Finally, delete all Tasks
            const deletedTasks = await tx.task.deleteMany({});

            // Note: Sequence counter reset is handled at application level
            // The next task created will start from sequence_id = 1

            return {
                taskDependencies: deletedDependencies.count,
                assets: deletedAssets.count,
                comments: deletedComments.count,
                timeLogs: deletedTimeLogs.count,
                notifications: deletedNotifications.count,
                tasks: deletedTasks.count
            };
        });

        // Log the action for audit trail
        console.log(`[AUDIT] All tasks cleared by user ${userId} at ${new Date().toISOString()}`);
        console.log('[AUDIT] Deletion summary:', result);

        return {
            success: true,
            deletedCounts: result,
            message: `Successfully cleared all tasks. Deleted ${result.tasks} tasks and related data.`
        };

    } catch (error) {
        console.error('[ERROR] Failed to clear all tasks:', error);
        throw new Error('Failed to clear all tasks. Please try again or contact support.');
    }
}

/**
 * Get statistics about tasks before clearing
 * Useful for showing user what will be deleted
 */
export async function getTaskClearanceStats() {
    const [
        taskCount,
        dependencyCount,
        assetCount,
        commentCount,
        timeLogCount,
        notificationCount
    ] = await Promise.all([
        prisma.task.count(),
        prisma.taskDependency.count(),
        prisma.asset.count(),
        prisma.comment.count(),
        prisma.timeLog.count(),
        prisma.notification.count({
            where: {
                OR: [
                    { type: 'TASK_ASSIGNED' },
                    { type: 'TASK_UPDATED' },
                    { type: 'TASK_COMPLETED' },
                    { type: 'TASK_OVERDUE' },
                    { type: 'TASK_COMMENT' },
                    { type: 'TASK_MENTION' },
                    { link: { contains: '/tasks/' } }
                ]
            }
        })
    ]);

    return {
        tasks: taskCount,
        dependencies: dependencyCount,
        assets: assetCount,
        comments: commentCount,
        timeLogs: timeLogCount,
        notifications: notificationCount
    };
}
