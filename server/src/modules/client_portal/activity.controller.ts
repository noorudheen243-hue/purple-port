import { Request, Response } from 'express';
import prisma from '../../utils/prisma';

export const getActivityLogs = async (req: Request, res: Response) => {
    try {
        const { userId, department, excludeDepartment, client_id, startDate, endDate, teamView, activityType, performerId } = req.query;

        const dateFilter = (startDate || endDate) ? {
            updatedAt: {
                ...(startDate && { gte: new Date(startDate as string) }),
                ...(endDate && { lte: new Date(endDate as string) })
            }
        } : {};

        // Helper to get user filter based on department/excludeDepartment
        let userFilter: any = {};
        let taskUserFilter: any = {};

        // Use performerId if provided (explicit filter)
        const activeUserId = (performerId as string) || (userId as string);

        // Specialized DM Team View: Marketing, Web, Web_SEO
        if (teamView === 'DM') {
            const staffs = await prisma.user.findMany({
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
            } else {
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
        } else if (activeUserId) {
            userFilter = { user_id: activeUserId };
            taskUserFilter = {
                OR: [
                    { assignee_id: activeUserId },
                    { assigned_by_id: activeUserId }
                ]
            };
        } else if (department || excludeDepartment) {
            const baseStaffFilter: any = {
                ...(department && { department: department as string }),
                ...(excludeDepartment && { department: { not: excludeDepartment as string } })
            };
            const staffs = await prisma.user.findMany({
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
                            ...(excludeDepartment ? [{ department: { not: excludeDepartment as string } }] : []),
                            ...(department ? [{ department: department as string }] : [])
                        ]
                    }
                ]
            };
        }

        const fetchAll = !activityType || activityType === 'all';

        // 1. Fetch Meta Ads Logs
        const metaLogs = (fetchAll || activityType === 'Meta Ads') ? await prisma.metaAdsLog.findMany({
            where: {
                ...userFilter,
                ...(client_id && { client_id: client_id as string }),
                ...dateFilter
            },
            include: {
                client: { select: { name: true } },
                user: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        }) : [];

        // 2. Fetch Google Ads Logs
        const googleLogs = (fetchAll || activityType === 'Google Ads') ? await prisma.googleAdsLog.findMany({
            where: {
                ...userFilter,
                ...(client_id && { client_id: client_id as string }),
                ...dateFilter
            },
            include: {
                client: { select: { name: true } },
                user: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        }) : [];

        // 3. Fetch SEO Logs
        const seoLogs = (fetchAll || activityType === 'SEO') ? await prisma.seoLog.findMany({
            where: {
                ...userFilter,
                ...(client_id && { client_id: client_id as string }),
                ...dateFilter
            },
            include: {
                client: { select: { name: true } },
                user: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        }) : [];

        // 4. Fetch Web Dev Projects
        const webLogs = (fetchAll || activityType === 'Web Dev') ? await prisma.webDevProject.findMany({
            where: {
                ...userFilter,
                ...(client_id && { client_id: client_id as string }),
                ...dateFilter
            },
            include: {
                client: { select: { name: true } },
                user: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        }) : [];

        // 5. Fetch Content Deliverables
        const contentLogs = (fetchAll || activityType === 'Creative Task') ? await prisma.contentDeliverable.findMany({
            where: {
                ...userFilter,
                ...(client_id && { client_id: client_id as string }),
                ...dateFilter
            },
            include: {
                client: { select: { name: true } },
                creator: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        }) : [];

        // 6. Fetch Standard Tasks
        const tasks = (fetchAll || activityType === 'Task') ? await prisma.task.findMany({
            where: {
                ...taskUserFilter,
                ...(client_id && { client_id: client_id as string }),
                ...dateFilter
            },
            include: {
                client: { select: { name: true } },
                assignee: { select: { full_name: true } },
                assigned_by: { select: { full_name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 100
        }) : [];

        // console.log('[ACTIVITY-DEBUG] Counts:', { meta: metaLogs.length, google: googleLogs.length, seo: seoLogs.length, web: webLogs.length, content: contentLogs.length, tasks: tasks.length });

        const activities: any[] = [];

        metaLogs.forEach(log => activities.push({
            id: log.id,
            date: log.updatedAt,
            type: 'Meta Ads',
            details: `Updated Meta Ads: ${log.campaign_name}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'meta',
            category: 'CAMPAIGN',
            userName: (log as any).user?.full_name || 'System'
        }));

        googleLogs.forEach(log => activities.push({
            id: log.id,
            date: log.updatedAt,
            type: 'Google Ads',
            details: `Updated Google Ads: ${log.campaign_name}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'google',
            category: 'CAMPAIGN',
            userName: (log as any).user?.full_name || 'System'
        }));

        seoLogs.forEach(log => activities.push({
            id: log.id,
            date: log.updatedAt,
            type: 'SEO',
            details: `Updated SEO: ${log.month}/${log.year}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'seo',
            category: 'CAMPAIGN',
            userName: (log as any).user?.full_name || 'System'
        }));

        webLogs.forEach(log => activities.push({
            id: log.id,
            date: log.updatedAt,
            type: 'Web Dev',
            details: `Updated Project: ${log.project_name}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'web',
            category: 'CAMPAIGN',
            userName: (log as any).user?.full_name || 'System'
        }));

        contentLogs.forEach(log => activities.push({
            id: log.id,
            date: log.updatedAt,
            type: 'Creative Task',
            details: `Submitted: ${log.title}`,
            client: log.client.name,
            clientId: log.client_id,
            tab: 'content',
            category: 'CAMPAIGN',
            userName: (log as any).creator?.full_name || 'System'
        }));

        tasks.forEach(task => {
            let details = task.title;
            if (task.assigned_by && task.assignee) {
                details = `Assigned: ${task.title} to ${task.assignee.full_name}`;
            } else if (task.assigned_by) {
                details = `New Task: ${task.title} (By ${task.assigned_by.full_name})`;
            }

            activities.push({
                id: task.id,
                date: task.updatedAt,
                type: 'Task',
                details: details,
                client: task.client?.name || 'Internal',
                clientId: task.client_id,
                tab: 'history',
                category: 'TASK',
                userName: task.assigned_by?.full_name || 'System'
            });
        });

        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json(activities);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Fetch full detail for a single activity log entry by type and id
export const getActivityLogDetail = async (req: Request, res: Response) => {
    try {
        const { type, id } = req.params;

        let record: any = null;

        if (type === 'meta') {
            record = await prisma.metaAdsLog.findUnique({
                where: { id },
                include: { client: { select: { name: true, id: true } }, user: { select: { full_name: true } } }
            });
        } else if (type === 'google') {
            record = await prisma.googleAdsLog.findUnique({
                where: { id },
                include: { client: { select: { name: true, id: true } }, user: { select: { full_name: true } } }
            });
        } else if (type === 'seo') {
            record = await prisma.seoLog.findUnique({
                where: { id },
                include: { client: { select: { name: true, id: true } }, user: { select: { full_name: true } } }
            });
        } else if (type === 'web') {
            record = await prisma.webDevProject.findUnique({
                where: { id },
                include: { client: { select: { name: true, id: true } }, user: { select: { full_name: true } } }
            });
        } else if (type === 'content') {
            record = await prisma.contentDeliverable.findUnique({
                where: { id },
                include: { client: { select: { name: true, id: true } }, creator: { select: { full_name: true } } }
            });
        } else {
            return res.status(400).json({ message: 'Invalid activity type' });
        }

        if (!record) return res.status(404).json({ message: 'Record not found' });
        res.json(record);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Admin-only: Delete ALL activity logs across all tables
export const deleteAllActivityLogs = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        if (!['ADMIN', 'DEVELOPER_ADMIN'].includes(user.role)) {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const [meta, google, seo, web, content] = await Promise.all([
            prisma.metaAdsLog.deleteMany({}),
            prisma.googleAdsLog.deleteMany({}),
            prisma.seoLog.deleteMany({}),
            prisma.webDevProject.deleteMany({}),
            prisma.contentDeliverable.deleteMany({})
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
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Admin-only: Delete SELECTED activity logs
export const deleteSelectedActivityLogs = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        if (!['ADMIN', 'DEVELOPER_ADMIN'].includes(user.role)) {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const { logs } = req.body; // Expecting array of { id, tab }
        if (!Array.isArray(logs) || logs.length === 0) {
            return res.status(400).json({ message: 'No logs provided for deletion.' });
        }

        const metaIds = logs.filter((l: any) => l.tab === 'meta').map((l: any) => l.id);
        const googleIds = logs.filter((l: any) => l.tab === 'google').map((l: any) => l.id);
        const seoIds = logs.filter((l: any) => l.tab === 'seo').map((l: any) => l.id);
        const webIds = logs.filter((l: any) => l.tab === 'web').map((l: any) => l.id);
        const contentIds = logs.filter((l: any) => l.tab === 'content').map((l: any) => l.id);

        const deletePromises = [];
        if (metaIds.length > 0) deletePromises.push(prisma.metaAdsLog.deleteMany({ where: { id: { in: metaIds } } }));
        if (googleIds.length > 0) deletePromises.push(prisma.googleAdsLog.deleteMany({ where: { id: { in: googleIds } } }));
        if (seoIds.length > 0) deletePromises.push(prisma.seoLog.deleteMany({ where: { id: { in: seoIds } } }));
        if (webIds.length > 0) deletePromises.push(prisma.webDevProject.deleteMany({ where: { id: { in: webIds } } }));
        if (contentIds.length > 0) deletePromises.push(prisma.contentDeliverable.deleteMany({ where: { id: { in: contentIds } } }));

        await Promise.all(deletePromises);

        res.json({ message: 'Selected activity logs deleted successfully.' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
