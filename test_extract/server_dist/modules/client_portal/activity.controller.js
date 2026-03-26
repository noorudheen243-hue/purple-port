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
        const { userId, department, excludeDepartment, client_id, startDate, endDate, teamView } = req.query;
        const dateFilter = (startDate || endDate) ? {
            createdAt: Object.assign(Object.assign({}, (startDate && { gte: new Date(startDate) })), (endDate && { lte: new Date(endDate) }))
        } : {};
        // Helper to get user filter based on department/excludeDepartment
        let userFilter = {};
        let taskUserFilter = {};
        // Specialized DM Team View: Marketing, Web, Web_SEO
        if (teamView === 'DM') {
            const staffs = yield prisma_1.default.user.findMany({
                where: { department: { in: ['MARKETING', 'WEB', 'WEB_SEO'] } },
                select: { id: true }
            });
            const staffIds = staffs.map(s => s.id);
            if (userId) {
                userFilter = { user_id: userId };
                // Include tasks where user is assignee OR assigner, OR relevant Creative/DM tasks
                taskUserFilter = {
                    OR: [
                        { assignee_id: userId },
                        { assigned_by_id: userId },
                        { department: { in: ['CREATIVE', 'DIGITAL_MARKETING'] } }
                    ]
                };
            }
            else {
                userFilter = { user_id: { in: staffIds } };
                // Include tasks where team members are assignee OR assigner, OR relevant Creative/DM tasks
                taskUserFilter = {
                    OR: [
                        { assignee_id: { in: staffIds } },
                        { assigned_by_id: { in: staffIds } },
                        { department: { in: ['CREATIVE', 'DIGITAL_MARKETING'] } }
                    ]
                };
            }
        }
        else if (userId) {
            userFilter = { user_id: userId };
            taskUserFilter = {
                OR: [
                    { assignee_id: userId },
                    { assigned_by_id: userId }
                ]
            };
        }
        else if (department || excludeDepartment) {
            const baseStaffFilter = Object.assign(Object.assign({}, (department && { department: department })), (excludeDepartment && { department: { not: excludeDepartment } }));
            const staffs = yield prisma_1.default.user.findMany({
                where: baseStaffFilter,
                select: { id: true }
            });
            const staffIds = staffs.map(s => s.id);
            userFilter = {
                OR: [
                    { user_id: { in: staffIds } },
                    { user_id: null }
                ]
            };
            taskUserFilter = {
                OR: [
                    { assignee_id: { in: staffIds } },
                    { assigned_by_id: { in: staffIds } },
                    {
                        AND: [
                            { assignee_id: null },
                            ...(excludeDepartment ? [{ department: { not: excludeDepartment } }] : []),
                            ...(department ? [{ department: department }] : [])
                        ]
                    }
                ]
            };
        }
        // 1. Fetch Meta Ads Logs
        const metaLogs = yield prisma_1.default.metaAdsLog.findMany({
            where: Object.assign(Object.assign(Object.assign({}, userFilter), (client_id && { client_id: client_id })), dateFilter),
            include: { client: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
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
        // 6. Fetch Standard Tasks
        const tasks = yield prisma_1.default.task.findMany({
            where: Object.assign(Object.assign(Object.assign({}, taskUserFilter), (client_id && { client_id: client_id })), dateFilter),
            include: {
                client: { select: { name: true } },
                assignee: { select: { full_name: true } },
                assigned_by: { select: { full_name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        const activities = [];
        metaLogs.forEach(log => activities.push({
            id: log.id,
            date: log.createdAt,
            type: 'Meta Ads',
            details: `Updated Meta Ads: ${log.campaign_name}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'meta',
            category: 'CAMPAIGN'
        }));
        googleLogs.forEach(log => activities.push({
            id: log.id,
            date: log.createdAt,
            type: 'Google Ads',
            details: `Updated Google Ads: ${log.campaign_name}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'google',
            category: 'CAMPAIGN'
        }));
        seoLogs.forEach(log => activities.push({
            id: log.id,
            date: log.createdAt,
            type: 'SEO',
            details: `Updated SEO: ${log.month}/${log.year}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'seo',
            category: 'CAMPAIGN'
        }));
        webLogs.forEach(log => activities.push({
            id: log.id,
            date: log.createdAt,
            type: 'Web Dev',
            details: `Updated Project: ${log.project_name}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'web',
            category: 'CAMPAIGN'
        }));
        contentLogs.forEach(log => activities.push({
            id: log.id,
            date: log.createdAt,
            type: 'Creative Task',
            details: `Submitted: ${log.title}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'content',
            category: 'CAMPAIGN'
        }));
        console.log(`[ACTIVITY-DEBUG] Found ${tasks.length} tasks for logs.`);
        tasks.forEach(task => {
            var _a;
            let details = task.title;
            if (task.assigned_by && task.assignee) {
                details = `Assigned: ${task.title} to ${task.assignee.full_name}`;
            }
            else if (task.assigned_by) {
                details = `New Task: ${task.title} (By ${task.assigned_by.full_name})`;
            }
            console.log(`[TASK-LOG-ITEM] ID: ${task.id}, Details: ${details}`);
            activities.push({
                id: task.id,
                date: task.createdAt,
                type: 'Task',
                details: details,
                client: ((_a = task.client) === null || _a === void 0 ? void 0 : _a.name) || 'Internal',
                clientId: task.client_id,
                tab: 'history',
                category: 'TASK'
            });
        });
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json(activities);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getActivityLogs = getActivityLogs;
