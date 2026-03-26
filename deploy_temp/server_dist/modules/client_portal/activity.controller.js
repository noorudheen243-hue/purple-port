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
exports.deleteSelectedActivityLogs = exports.deleteAllActivityLogs = exports.getActivityLogDetail = exports.getActivityLogs = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const getActivityLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, department, excludeDepartment, client_id, startDate, endDate, teamView, activityType, performerId } = req.query;
        const dateFilter = (startDate || endDate) ? {
            updatedAt: Object.assign(Object.assign({}, (startDate && { gte: new Date(startDate) })), (endDate && { lte: new Date(endDate) }))
        } : {};
        // Helper to get user filter based on department/excludeDepartment
        let userFilter = {};
        let taskUserFilter = {};
        // Use performerId if provided (explicit filter)
        const activeUserId = performerId || userId;
        // Specialized DM Team View: Marketing, Web, Web_SEO
        if (teamView === 'DM') {
            const staffs = yield prisma_1.default.user.findMany({
                where: { department: { in: ['MARKETING', 'WEB', 'WEB_SEO'] } },
                select: { id: true }
            });
            const staffIds = staffs.map(s => s.id);
            if (activeUserId) {
                userFilter = { user_id: activeUserId };
                // ONLY show tasks where this user is the assignee OR the assigner
                taskUserFilter = {
                    OR: [
                        { assignee_id: activeUserId },
                        { assigned_by_id: activeUserId }
                    ]
                };
            }
            else {
                userFilter = {}; // Broaden for team view: show all campaign logs
                // Team View: Show all tasks assigned to/by team members, plus any tasks in relevant departments
                taskUserFilter = {
                    OR: [
                        { assignee_id: { in: staffIds } },
                        { assigned_by_id: { in: staffIds } },
                        { department: { in: ['CREATIVE', 'DIGITAL_MARKETING'] } }
                    ]
                };
            }
        }
        else if (activeUserId) {
            userFilter = { user_id: activeUserId };
            taskUserFilter = {
                OR: [
                    { assignee_id: activeUserId },
                    { assigned_by_id: activeUserId }
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
        const fetchAll = !activityType || activityType === 'all';
        // 1. Fetch Meta Ads Logs
        const metaLogs = (fetchAll || activityType === 'Meta Ads') ? yield prisma_1.default.metaAdsLog.findMany({
            where: Object.assign(Object.assign(Object.assign({}, userFilter), (client_id && { client_id: client_id })), dateFilter),
            include: {
                client: { select: { name: true } },
                user: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        }) : [];
        // 2. Fetch Google Ads Logs
        const googleLogs = (fetchAll || activityType === 'Google Ads') ? yield prisma_1.default.googleAdsLog.findMany({
            where: Object.assign(Object.assign(Object.assign({}, userFilter), (client_id && { client_id: client_id })), dateFilter),
            include: {
                client: { select: { name: true } },
                user: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        }) : [];
        // 3. Fetch SEO Logs
        const seoLogs = (fetchAll || activityType === 'SEO') ? yield prisma_1.default.seoLog.findMany({
            where: Object.assign(Object.assign(Object.assign({}, userFilter), (client_id && { client_id: client_id })), dateFilter),
            include: {
                client: { select: { name: true } },
                user: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        }) : [];
        // 4. Fetch Web Dev Projects
        const webLogs = (fetchAll || activityType === 'Web Dev') ? yield prisma_1.default.webDevProject.findMany({
            where: Object.assign(Object.assign(Object.assign({}, userFilter), (client_id && { client_id: client_id })), dateFilter),
            include: {
                client: { select: { name: true } },
                user: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        }) : [];
        // 5. Fetch Content Deliverables
        const contentLogs = (fetchAll || activityType === 'Creative Task') ? yield prisma_1.default.contentDeliverable.findMany({
            where: Object.assign(Object.assign(Object.assign({}, userFilter), (client_id && { client_id: client_id })), dateFilter),
            include: {
                client: { select: { name: true } },
                creator: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        }) : [];
        // 6. Fetch Standard Tasks
        const tasks = (fetchAll || activityType === 'Task') ? yield prisma_1.default.task.findMany({
            where: Object.assign(Object.assign(Object.assign({}, taskUserFilter), (client_id && { client_id: client_id })), dateFilter),
            include: {
                client: { select: { name: true } },
                assignee: { select: { full_name: true } },
                assigned_by: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 100
        }) : [];
        // console.log('[ACTIVITY-DEBUG] Counts:', { meta: metaLogs.length, google: googleLogs.length, seo: seoLogs.length, web: webLogs.length, content: contentLogs.length, tasks: tasks.length });
        const activities = [];
        metaLogs.forEach(log => {
            var _a;
            return activities.push({
                id: log.id,
                date: log.updatedAt,
                type: 'Meta Ads',
                details: `Updated Meta Ads: ${log.campaign_name}`,
                client: log.client.name,
                clientId: log.client_id,
                tab: 'meta',
                category: 'CAMPAIGN',
                userName: ((_a = log.user) === null || _a === void 0 ? void 0 : _a.full_name) || 'System'
            });
        });
        googleLogs.forEach(log => {
            var _a;
            return activities.push({
                id: log.id,
                date: log.updatedAt,
                type: 'Google Ads',
                details: `Updated Google Ads: ${log.campaign_name}`,
                client: log.client.name,
                clientId: log.client_id,
                tab: 'google',
                category: 'CAMPAIGN',
                userName: ((_a = log.user) === null || _a === void 0 ? void 0 : _a.full_name) || 'System'
            });
        });
        seoLogs.forEach(log => {
            var _a;
            return activities.push({
                id: log.id,
                date: log.updatedAt,
                type: 'SEO',
                details: `Updated SEO: ${log.month}/${log.year}`,
                client: log.client.name,
                clientId: log.client_id,
                tab: 'seo',
                category: 'CAMPAIGN',
                userName: ((_a = log.user) === null || _a === void 0 ? void 0 : _a.full_name) || 'System'
            });
        });
        webLogs.forEach(log => {
            var _a;
            return activities.push({
                id: log.id,
                date: log.updatedAt,
                type: 'Web Dev',
                details: `Updated Project: ${log.project_name}`,
                client: log.client.name,
                clientId: log.client_id,
                tab: 'web',
                category: 'CAMPAIGN',
                userName: ((_a = log.user) === null || _a === void 0 ? void 0 : _a.full_name) || 'System'
            });
        });
        contentLogs.forEach(log => {
            var _a;
            return activities.push({
                id: log.id,
                date: log.updatedAt,
                type: 'Creative Task',
                details: `Submitted: ${log.title}`,
                client: log.client.name,
                clientId: log.client_id,
                tab: 'content',
                category: 'CAMPAIGN',
                userName: ((_a = log.creator) === null || _a === void 0 ? void 0 : _a.full_name) || 'System'
            });
        });
        tasks.forEach(task => {
            var _a, _b;
            let details = task.title;
            if (task.assigned_by && task.assignee) {
                details = `Assigned: ${task.title} to ${task.assignee.full_name}`;
            }
            else if (task.assigned_by) {
                details = `New Task: ${task.title} (By ${task.assigned_by.full_name})`;
            }
            activities.push({
                id: task.id,
                date: task.updatedAt,
                type: 'Task',
                details: details,
                client: ((_a = task.client) === null || _a === void 0 ? void 0 : _a.name) || 'Internal',
                clientId: task.client_id,
                tab: 'history',
                category: 'TASK',
                userName: ((_b = task.assigned_by) === null || _b === void 0 ? void 0 : _b.full_name) || 'System'
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
// Fetch full detail for a single activity log entry by type and id
const getActivityLogDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, id } = req.params;
        let record = null;
        if (type === 'meta') {
            record = yield prisma_1.default.metaAdsLog.findUnique({
                where: { id },
                include: { client: { select: { name: true, id: true } }, user: { select: { full_name: true } } }
            });
        }
        else if (type === 'google') {
            record = yield prisma_1.default.googleAdsLog.findUnique({
                where: { id },
                include: { client: { select: { name: true, id: true } }, user: { select: { full_name: true } } }
            });
        }
        else if (type === 'seo') {
            record = yield prisma_1.default.seoLog.findUnique({
                where: { id },
                include: { client: { select: { name: true, id: true } }, user: { select: { full_name: true } } }
            });
        }
        else if (type === 'web') {
            record = yield prisma_1.default.webDevProject.findUnique({
                where: { id },
                include: { client: { select: { name: true, id: true } }, user: { select: { full_name: true } } }
            });
        }
        else if (type === 'content') {
            record = yield prisma_1.default.contentDeliverable.findUnique({
                where: { id },
                include: { client: { select: { name: true, id: true } }, creator: { select: { full_name: true } } }
            });
        }
        else {
            return res.status(400).json({ message: 'Invalid activity type' });
        }
        if (!record)
            return res.status(404).json({ message: 'Record not found' });
        res.json(record);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getActivityLogDetail = getActivityLogDetail;
// Admin-only: Delete ALL activity logs across all tables
const deleteAllActivityLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!['ADMIN', 'DEVELOPER_ADMIN'].includes(user.role)) {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        const [meta, google, seo, web, content] = yield Promise.all([
            prisma_1.default.metaAdsLog.deleteMany({}),
            prisma_1.default.googleAdsLog.deleteMany({}),
            prisma_1.default.seoLog.deleteMany({}),
            prisma_1.default.webDevProject.deleteMany({}),
            prisma_1.default.contentDeliverable.deleteMany({})
        ]);
        res.json({
            message: 'All activity logs deleted successfully.',
            deleted: {
                meta: meta.count,
                google: google.count,
                seo: seo.count,
                web: web.count,
                content: content.count
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteAllActivityLogs = deleteAllActivityLogs;
// Admin-only: Delete SELECTED activity logs
const deleteSelectedActivityLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!['ADMIN', 'DEVELOPER_ADMIN'].includes(user.role)) {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        const { logs } = req.body; // Expecting array of { id, tab }
        if (!Array.isArray(logs) || logs.length === 0) {
            return res.status(400).json({ message: 'No logs provided for deletion.' });
        }
        const metaIds = logs.filter((l) => l.tab === 'meta').map((l) => l.id);
        const googleIds = logs.filter((l) => l.tab === 'google').map((l) => l.id);
        const seoIds = logs.filter((l) => l.tab === 'seo').map((l) => l.id);
        const webIds = logs.filter((l) => l.tab === 'web').map((l) => l.id);
        const contentIds = logs.filter((l) => l.tab === 'content').map((l) => l.id);
        const deletePromises = [];
        if (metaIds.length > 0)
            deletePromises.push(prisma_1.default.metaAdsLog.deleteMany({ where: { id: { in: metaIds } } }));
        if (googleIds.length > 0)
            deletePromises.push(prisma_1.default.googleAdsLog.deleteMany({ where: { id: { in: googleIds } } }));
        if (seoIds.length > 0)
            deletePromises.push(prisma_1.default.seoLog.deleteMany({ where: { id: { in: seoIds } } }));
        if (webIds.length > 0)
            deletePromises.push(prisma_1.default.webDevProject.deleteMany({ where: { id: { in: webIds } } }));
        if (contentIds.length > 0)
            deletePromises.push(prisma_1.default.contentDeliverable.deleteMany({ where: { id: { in: contentIds } } }));
        yield Promise.all(deletePromises);
        res.json({ message: 'Selected activity logs deleted successfully.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteSelectedActivityLogs = deleteSelectedActivityLogs;
