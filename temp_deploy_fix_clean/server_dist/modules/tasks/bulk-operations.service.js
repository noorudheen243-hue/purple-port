"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllTasks = clearAllTasks;
exports.getTaskClearanceStats = getTaskClearanceStats;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Clear all tasks and related data from the system
 * This is a destructive operation that cannot be undone
 * Should only be called by DEVELOPER_ADMIN role
 */
function clearAllTasks(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Use a transaction to ensure atomicity
            const result = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Delete TaskDependencies first (references tasks)
                const deletedDependencies = yield tx.taskDependency.deleteMany({});
                // 2. Delete Assets (references tasks)
                const deletedAssets = yield tx.asset.deleteMany({});
                // 3. Delete Comments (references tasks, has self-referencing for replies)
                // Delete in reverse order: replies first, then parent comments
                const deletedComments = yield tx.comment.deleteMany({});
                // 4. Delete TimeLogs (references tasks)
                const deletedTimeLogs = yield tx.timeLog.deleteMany({});
                // 5. Delete task-related notifications
                // Filter by type to only delete task-related ones
                const deletedNotifications = yield tx.notification.deleteMany({
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
                const deletedTasks = yield tx.task.deleteMany({});
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
            }));
            // Log the action for audit trail
            console.log(`[AUDIT] All tasks cleared by user ${userId} at ${new Date().toISOString()}`);
            console.log('[AUDIT] Deletion summary:', result);
            return {
                success: true,
                deletedCounts: result,
                message: `Successfully cleared all tasks. Deleted ${result.tasks} tasks and related data.`
            };
        }
        catch (error) {
            console.error('[ERROR] Failed to clear all tasks:', error);
            throw new Error('Failed to clear all tasks. Please try again or contact support.');
        }
    });
}
/**
 * Get statistics about tasks before clearing
 * Useful for showing user what will be deleted
 */
function getTaskClearanceStats() {
    return __awaiter(this, void 0, void 0, function* () {
        const [taskCount, dependencyCount, assetCount, commentCount, timeLogCount, notificationCount] = yield Promise.all([
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
    });
}
