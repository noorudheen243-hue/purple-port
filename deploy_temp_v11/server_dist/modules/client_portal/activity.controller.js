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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityLogs = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const getActivityLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, department, excludeDepartment, client_id, startDate, endDate } = req.query;
        const dateFilter = (startDate || endDate) ? {
            createdAt: Object.assign(Object.assign({}, (startDate && { gte: new Date(startDate) })), (endDate && { lte: new Date(endDate) }))
        } : {};
        // Helper to get user filter based on department/excludeDepartment
        let userFilter = {};
        let taskUserFilter = {};
        const baseStaffFilter = Object.assign(Object.assign({}, (department && { department: department })), (excludeDepartment && { department: { not: excludeDepartment } }));
        console.log(`[ActivityLog] Query Params: userId=${userId}, dep=${department}, exDep=${excludeDepartment}`);
        if (userId) {
            // Fetch user first to log their details for debugging
            const actualUser = yield prisma_1.default.user.findUnique({
                where: { id: userId },
                select: { id: true, department: true }
            });
            // Now check if they match the department filters
            if (!actualUser || (excludeDepartment && actualUser.department === excludeDepartment) || (department && actualUser.department !== department)) {
                console.log(`[ActivityLog] User ${userId} excluded. User Dept: ${actualUser === null || actualUser === void 0 ? void 0 : actualUser.department}. Filter: Exclude=${excludeDepartment}, Only=${department}`);
                return res.json([]);
            }
            console.log(`[ActivityLog] User ${userId} accepted. Dept: ${actualUser.department}`);
            userFilter = { user_id: userId };
            taskUserFilter = { assignee_id: userId };
        }
        else if (department || excludeDepartment) {
            const staffs = yield prisma_1.default.user.findMany({
                where: baseStaffFilter,
                select: { id: true }
            });
            const staffIds = staffs.map(s => s.id);
            console.log(`[ActivityLog] Query for Department: ${department}, Exclude: ${excludeDepartment}`);
            console.log(`[ActivityLog] Staff IDs found: ${staffIds.length}`);
            // Collective View: Show logs by relevant staff OR historical logs (null user_id)
            userFilter = {
                OR: [
                    { user_id: { in: staffIds } },
                    { user_id: null }
                ]
            };
            // Tasks: Show if assigned to staff OR if it's an unassigned task matching criteria
            taskUserFilter = {
                OR: [
                    { assignee_id: { in: staffIds } },
                    {
                        AND: [
                            { assignee_id: null },
                            // Check if task doesn't belong to excluded department
                            ...(excludeDepartment ? [{ department: { not: excludeDepartment } }] : []),
                            // If we specifically want a department
                            ...(department ? [{ department: department }] : [])
                        ]
                    }
                ]
            };
        }
        console.log('[ActivityLog] User Filter:', JSON.stringify(userFilter));
        console.log('[ActivityLog] Task Filter:', JSON.stringify(taskUserFilter));
        // 1. Fetch Meta Ads Logs
        const metaLogs = yield prisma_1.default.metaAdsLog.findMany({
            where: Object.assign(Object.assign(Object.assign({}, userFilter), (client_id && { client_id: client_id })), dateFilter),
            include: { client: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        console.log(`[ActivityLog] Meta Logs: ${metaLogs.length}`);
        // 2. Fetch Google Ads Logs
        const googleLogs = yield prisma_1.default.googleAdsLog.findMany({
            where: Object.assign(Object.assign(Object.assign({}, userFilter), (client_id && { client_id: client_id })), dateFilter),
            include: { client: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        // 3. Fetch SEO Logs
        const seoLogs = yield prisma_1.default.seoLog.findMany({
            where: Object.assign(Object.assign(Object.assign({}, userFilter), (client_id && { client_id: client_id })), dateFilter),
            include: { client: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        // 4. Fetch Web Dev Projects
        const webLogs = yield prisma_1.default.webDevProject.findMany({
            where: Object.assign(Object.assign(Object.assign({}, userFilter), (client_id && { client_id: client_id })), dateFilter),
            include: { client: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        // 5. Fetch Content Deliverables
        const contentLogs = yield prisma_1.default.contentDeliverable.findMany({
            where: Object.assign(Object.assign(Object.assign({}, userFilter), (client_id && { client_id: client_id })), dateFilter),
            include: { client: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        // 6. Fetch Standard Tasks (Filtered by user or staff list)
        const tasks = yield prisma_1.default.task.findMany({
            where: Object.assign(Object.assign(Object.assign({}, taskUserFilter), (client_id && { client_id: client_id })), dateFilter),
            include: { client: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        // Consolidate into a unified format
        const activities = [];
        metaLogs.forEach(log => activities.push({
            id: log.id,
            date: log.createdAt,
            type: 'Meta Ads',
            details: `Updated Meta Ads campaign: ${log.campaign_name}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'meta',
            category: 'CAMPAIGN'
        }));
        googleLogs.forEach(log => activities.push({
            id: log.id,
            date: log.createdAt,
            type: 'Google Ads',
            details: `Updated Google Ads campaign: ${log.campaign_name}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'google',
            category: 'CAMPAIGN'
        }));
        seoLogs.forEach(log => activities.push({
            id: log.id,
            date: log.createdAt,
            type: 'SEO',
            details: `Updated SEO Log for ${log.month}/${log.year}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'seo',
            category: 'CAMPAIGN'
        }));
        webLogs.forEach(log => activities.push({
            id: log.id,
            date: log.createdAt,
            type: 'Web Dev',
            details: `Updated Web Project: ${log.project_name}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'web',
            category: 'CAMPAIGN'
        }));
        contentLogs.forEach(log => activities.push({
            id: log.id,
            date: log.createdAt,
            type: 'Creative Task',
            details: `Submitted Deliverable: ${log.title}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'content',
            category: 'CAMPAIGN'
        }));
        tasks.forEach(task => {
            var _a;
            return activities.push({
                id: task.id,
                date: task.createdAt,
                type: 'Task',
                details: task.title,
                client: ((_a = task.client) === null || _a === void 0 ? void 0 : _a.name) || 'Internal',
                clientId: task.client_id,
                tab: 'history',
                category: 'TASK'
            });
        });
        // Sort by newest first
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json(activities);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getActivityLogs = getActivityLogs;
