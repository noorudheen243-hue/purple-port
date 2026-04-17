import { Request, Response } from 'express';
import prisma from '../../utils/prisma';

// Helper to validate client context for security
const getValidatedClientId = (req: Request): string | null => {
    const user = req.user as any;
    const requestedClientId = req.query.clientId as string || req.body.client_id as string;

    if (!requestedClientId) return null;

    // Logic:
    // If user is CLIENT, they can ONLY access their own linked_client_id.
    // If user is INTERNAL (Admin/Manager/Staff), they can access any clientId provided.

    if (user.role === 'CLIENT') {
        if (requestedClientId !== user.linked_client_id) {
            return null; // Security violation
        }
    }

    return requestedClientId;
};

// --- META ADS ---

export const getIntegratedCampaigns = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: "Access Denied: Invalid Client Context" });

        const campaigns = await prisma.marketingCampaign.findMany({
            where: { clientId, platform: { in: ['meta', 'META'] } },
            include: {
                marketingMetrics: {
                    orderBy: { date: 'desc' },
                    take: 1
                }
            }
        });

        // Find the latest sync failure for this client to inform the UI
        // We look for any sync log (even if overall SUCCESS) that mentions permission errors (Code 200 / OAuthException)
        const syncError = await (prisma as any).marketingSyncLog.findFirst({
            where: { 
                platform: { in: ['ALL', 'meta', 'META'] },
                OR: [
                    { details: { contains: '200' } },
                    { details: { contains: 'OAuthException' } },
                    { details: { contains: 'permission' } }
                ]
            },
            orderBy: { startedAt: 'desc' }
        });

        res.json({
            campaigns,
            syncStatus: syncError ? {
                isError: true,
                message: syncError.details,
                type: 'PERMISSION_DENIED'
            } : { isError: false }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMetaAdsLogs = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: "Access Denied: Invalid Client Context" });

        const { startDate, endDate } = req.query;
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter = {
                date: {
                    ...(startDate && { gte: new Date(startDate as string) }),
                    ...(endDate && { lte: new Date(endDate as string) })
                }
            };
        }

        const logs = await prisma.metaAdsLog.findMany({
            where: { client_id: clientId, ...dateFilter },
            include: { group: true },
            orderBy: { date: 'desc' }
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createMetaAdsLog = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { client_id, marketing_campaign_id, notes, date, spend, results, reach, impressions, group_id } = req.body;

        if (!marketing_campaign_id) {
            return res.status(400).json({ message: "Marketing Campaign ID is required to fetch real-time data." });
        }

        // Try finding by internal ID or External ID
        const campaign = await prisma.marketingCampaign.findFirst({
            where: { 
                OR: [
                    { id: marketing_campaign_id },
                    { externalCampaignId: String(marketing_campaign_id), clientId: client_id }
                ]
            },
            include: {
                marketingMetrics: { orderBy: { date: 'desc' }, take: 1 }
            }
        });

        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found. Please sync data first to ensure campaign is registered." });
        }

        const latestMetric = campaign.marketingMetrics[0];

        // Format snapshot - prefer manual/form results if provided
        const finalResults = results !== undefined ? parseInt(results) : (latestMetric?.results || latestMetric?.conversions || 0);
        const finalReach = reach !== undefined ? parseInt(reach) : (latestMetric?.reach || 0);
        const finalImpressions = impressions !== undefined ? parseInt(impressions) : (latestMetric?.impressions || 0);
        const finalSpend = spend !== undefined ? parseFloat(spend) : (latestMetric?.spend || 0);
        
        const results_json = {
            impressions: finalImpressions,
            reach: finalReach,
            clicks: latestMetric?.clicks || 0,
            cpc: latestMetric?.cpc || 0,
            results: finalResults,
            results_cost: finalResults > 0 ? (finalSpend / finalResults) : 0,
            messaging_conversations: latestMetric?.messaging_conversations || 0,
            new_messaging_contacts: latestMetric?.new_messaging_contacts || 0,
            purchases: latestMetric?.purchases || 0,
            cost_per_purchase: latestMetric?.cost_per_purchase || 0,
            is_manual: (results !== undefined || reach !== undefined || impressions !== undefined || spend !== undefined)
        };

        const log = await prisma.metaAdsLog.create({
            data: {
                client_id,
                user_id: user.id,
                campaign_name: campaign.name,
                marketing_campaign_id: campaign.id,
                objective: campaign.objective || 'Unknown',
                platform: 'META',
                spend: finalSpend,
                status: campaign.status || 'ACTIVE',
                results_json: JSON.stringify(results_json),
                notes,
                date: date ? new Date(date) : undefined,
                group_id: group_id || undefined
            }
        });

        // Log this activity globally as a system 'Task' so it appears natively in the task board
        await prisma.task.create({
            data: {
                title: `Created Campaign Data: ${campaign.name || 'Generic'}`,
                description: `New campaign tracking metrics saved. Spend: ₹${finalSpend}, Results: ${finalResults}`,
                status: 'COMPLETED',
                priority: 'MEDIUM',
                department: 'DIGITAL_MARKETING',
                client_id: client_id,
                marketing_campaign_id: campaign.id,
                assignee_id: user.id,
                assigned_by_id: user.id,
                reporter_id: user.id,
                completed_date: new Date()
            }
        });

        res.json(log);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateMetaAdsLog = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as any;
        const data = req.body;

        // Cleanup payload
        delete data.id;
        delete data.createdAt;
        delete data.updatedAt;
        delete data.client;
        delete data.user;
        delete data.client_id;
        delete data.user_id;
        delete data.marketingCampaign;

        // Parse types
        if (data.date) data.date = new Date(data.date);
        if (data.startDate) data.startDate = new Date(data.startDate);
        if (data.endDate) data.endDate = new Date(data.endDate);
        if (data.spend !== undefined) data.spend = parseFloat(data.spend || 0);
        if (data.reach !== undefined) data.reach = parseInt(data.reach || 0);
        if (data.impressions !== undefined) data.impressions = parseInt(data.impressions || 0);
        if (data.results !== undefined) data.results = parseInt(data.results || 0);
        if (data.frequency !== undefined) data.frequency = parseFloat(data.frequency || 0);
        if (data.cpp !== undefined) data.cpp = parseFloat(data.cpp || 0);
        if (data.results_json && typeof data.results_json === 'object') data.results_json = JSON.stringify(data.results_json);

        const log = await prisma.metaAdsLog.update({
            where: { id },
            data: { 
                ...data,
                user_id: user.id
            }
        });

        // Log this activity globally as a system 'Task' 
        await prisma.task.create({
            data: {
                title: `Updated Campaign Data: ${log.campaign_name || 'Generic'}`,
                description: `Campaign tracking metrics updated.`,
                status: 'COMPLETED',
                priority: 'MEDIUM',
                department: 'DIGITAL_MARKETING',
                client_id: log.client_id,
                marketing_campaign_id: log.marketing_campaign_id,
                assignee_id: user.id,
                assigned_by_id: user.id,
                reporter_id: user.id,
                completed_date: new Date()
            }
        });

        res.json(log);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteMetaAdsLog = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.metaAdsLog.delete({ where: { id } });
        res.json({ message: "Deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- GOOGLE ADS ---

export const getGoogleAdsLogs = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: "Access Denied: Invalid Client Context" });

        const { startDate, endDate } = req.query;
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter = {
                date: {
                    ...(startDate && { gte: new Date(startDate as string) }),
                    ...(endDate && { lte: new Date(endDate as string) })
                }
            };
        }

        const logs = await prisma.googleAdsLog.findMany({
            where: { client_id: clientId, ...dateFilter },
            include: { group: true },
            orderBy: { date: 'desc' }
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createGoogleAdsLog = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { client_id, campaign_name, campaign_type, spend, status, clicks, impressions, conversions, cpa, notes, date, startDate, endDate, group_id } = req.body;

        const log = await prisma.googleAdsLog.create({
            data: {
                client_id,
                user_id: user.id,
                campaign_name,
                campaign_type,
                spend: parseFloat(spend || 0),
                status: status || 'ACTIVE',
                clicks: parseInt(clicks || 0),
                impressions: parseInt(impressions || 0),
                conversions: parseInt(conversions || 0),
                cpa: parseFloat(cpa || 0),
                notes,
                date: date ? new Date(date) : undefined,
                group_id: group_id || undefined
            } as any
        });

        await prisma.task.create({
            data: {
                title: `Created Google Ads Data: ${campaign_name || 'Generic'}`,
                description: `New Google Ads tracking metrics saved. Spend: ₹${parseFloat(spend || 0)}`,
                status: 'COMPLETED',
                priority: 'MEDIUM',
                department: 'DIGITAL_MARKETING',
                client_id: client_id,
                assignee_id: user.id,
                assigned_by_id: user.id,
                reporter_id: user.id,
                completed_date: new Date()
            }
        });

        res.json(log);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateGoogleAdsLog = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as any;
        const data = req.body;

        // Cleanup
        delete data.id;
        delete data.createdAt;
        delete data.updatedAt;
        delete data.client;
        delete data.user;
        delete data.client_id;
        delete data.user_id;

        // Parse
        if (data.date) data.date = new Date(data.date);
        if (data.spend !== undefined) data.spend = parseFloat(data.spend || 0);
        if (data.clicks !== undefined) data.clicks = parseInt(data.clicks || 0);
        if (data.impressions !== undefined) data.impressions = parseInt(data.impressions || 0);
        if (data.conversions !== undefined) data.conversions = parseInt(data.conversions || 0);
        if (data.cpa !== undefined) data.cpa = parseFloat(data.cpa || 0);
        if (data.results_json && typeof data.results_json === 'object') data.results_json = JSON.stringify(data.results_json);

        const log = await prisma.googleAdsLog.update({
            where: { id },
            data: { 
                ...data,
                user_id: user.id
            }
        });

        await prisma.task.create({
            data: {
                title: `Updated Google Ads Data: ${log.campaign_name || 'Generic'}`,
                description: `Google Ads tracking metrics updated.`,
                status: 'COMPLETED',
                priority: 'MEDIUM',
                department: 'DIGITAL_MARKETING',
                client_id: log.client_id,
                assignee_id: user.id,
                assigned_by_id: user.id,
                reporter_id: user.id,
                completed_date: new Date()
            }
        });

        res.json(log);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteGoogleAdsLog = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.googleAdsLog.delete({ where: { id } });
        res.json({ message: "Deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- SEO ---

export const getSeoLogs = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: "Access Denied: Invalid Client Context" });

        const { startDate, endDate } = req.query;
        let dateFilter: any = {};

        if (startDate || endDate) {
            // SEO logs use 'month' and 'year' instead of 'date'
            const sDate = startDate ? new Date(startDate as string) : null;
            const eDate = endDate ? new Date(endDate as string) : null;

            if (sDate && eDate) {
                dateFilter = {
                    OR: [
                        { year: { gt: sDate.getFullYear(), lt: eDate.getFullYear() } },
                        { year: sDate.getFullYear(), month: { gte: sDate.getMonth() + 1 } },
                        { year: eDate.getFullYear(), month: { lte: eDate.getMonth() + 1 } }
                    ]
                };
            } else if (sDate) {
                dateFilter = {
                    OR: [
                        { year: { gt: sDate.getFullYear() } },
                        { year: sDate.getFullYear(), month: { gte: sDate.getMonth() + 1 } }
                    ]
                };
            } else if (eDate) {
                dateFilter = {
                    OR: [
                        { year: { lt: eDate.getFullYear() } },
                        { year: eDate.getFullYear(), month: { lte: eDate.getMonth() + 1 } }
                    ]
                };
            }
        }

        const logs = await prisma.seoLog.findMany({
            where: { client_id: clientId, ...dateFilter },
            include: { group: true },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createSeoLog = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { client_id, month, year, status, activities_json, keyword_rankings_json, organic_traffic, summary, group_id } = req.body;

        const log = await prisma.seoLog.upsert({
            where: {
                client_id_month_year: {
                    client_id,
                    month: parseInt(month),
                    year: parseInt(year)
                }
            },
            update: {
                user_id: user.id,
                status: status || 'ACTIVE',
                activities_json: typeof activities_json === 'object' ? JSON.stringify(activities_json) : activities_json,
                keyword_rankings_json: typeof keyword_rankings_json === 'object' ? JSON.stringify(keyword_rankings_json) : keyword_rankings_json,
                organic_traffic: parseInt(organic_traffic || 0),
                summary,
                group_id: group_id || undefined
            },
            create: {
                client_id,
                user_id: user.id,
                month: parseInt(month),
                year: parseInt(year),
                status: status || 'ACTIVE',
                activities_json: typeof activities_json === 'object' ? JSON.stringify(activities_json) : activities_json,
                keyword_rankings_json: typeof keyword_rankings_json === 'object' ? JSON.stringify(keyword_rankings_json) : keyword_rankings_json,
                organic_traffic: parseInt(organic_traffic || 0),
                summary,
                group_id: group_id || undefined
            }
        });
        await prisma.task.create({ 
            data: { 
                title: 'Saved SEO Report', 
                description: 'SEO report metrics saved.', 
                status: 'COMPLETED', 
                priority: 'MEDIUM', 
                department: 'DIGITAL_MARKETING', 
                client_id: client_id || log.client_id, 
                assignee_id: user.id, 
                assigned_by_id: user.id, 
                reporter_id: user.id, 
                completed_date: new Date() 
            } 
        });
        res.json(log);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSeoLog = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as any;
        const { month, year, status, activities_json, keyword_rankings_json, organic_traffic, summary, group_id } = req.body;

        const log = await prisma.seoLog.update({
            where: { id },
            data: {
                user_id: user.id,
                month: parseInt(month),
                year: parseInt(year),
                status: status || 'ACTIVE',
                activities_json: typeof activities_json === 'object' ? JSON.stringify(activities_json) : activities_json,
                keyword_rankings_json: typeof keyword_rankings_json === 'object' ? JSON.stringify(keyword_rankings_json) : keyword_rankings_json,
                organic_traffic: parseInt(organic_traffic || 0),
                summary,
                group_id: group_id || undefined
            }
        });
        await prisma.task.create({ 
            data: { 
                title: 'Updated SEO Report', 
                description: 'SEO report metrics updated.', 
                status: 'COMPLETED', 
                priority: 'MEDIUM', 
                department: 'DIGITAL_MARKETING', 
                client_id: log.client_id, 
                assignee_id: user.id, 
                assigned_by_id: user.id, 
                reporter_id: user.id, 
                completed_date: new Date() 
            } 
        });
        res.json(log);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteSeoLog = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.seoLog.delete({ where: { id } });
        res.json({ message: "Deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- WEB DEV ---

export const getWebProjects = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: "Access Denied: Invalid Client Context" });

        const projects = await prisma.webDevProject.findMany({
            where: { client_id: clientId },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(projects);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createWebProject = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { client_id, project_name, status, milestones_json, timeline_json, staging_url, live_url } = req.body;

        const project = await prisma.webDevProject.create({
            data: {
                client_id,
                user_id: user.id,
                project_name,
                status,
                milestones_json: typeof milestones_json === 'object' ? JSON.stringify(milestones_json) : milestones_json,
                timeline_json: typeof timeline_json === 'object' ? JSON.stringify(timeline_json) : timeline_json,
                staging_url,
                live_url
            }
        });
        await prisma.task.create({ data: { title: 'Saved Web Project: ' + project_name, description: 'Web dev project updated.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.json(project);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateWebProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as any;
        const data = req.body;

        // Sanitize JSON fields if present
        if (data.milestones_json && typeof data.milestones_json === 'object') {
            data.milestones_json = JSON.stringify(data.milestones_json);
        }
        if (data.timeline_json && typeof data.timeline_json === 'object') {
            data.timeline_json = JSON.stringify(data.timeline_json);
        }

        const project = await prisma.webDevProject.update({
            where: { id },
            data: {
                ...data,
                user_id: user.id
            }
        });
        await prisma.task.create({ data: { title: 'Updated Web Project', description: 'Web dev project updated.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: project.client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.json(project);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteWebProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.webDevProject.delete({ where: { id } });
        res.json({ message: "Deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// CONTENT & BRANDING
// ==========================================

export const getContentDeliverables = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: "Access Denied: Invalid Client Context" });

        const deliverables = await prisma.contentDeliverable.findMany({
            where: { client_id: clientId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(deliverables);
    } catch (error) {
        console.error('Error fetching content deliverables:', error);
        res.status(500).json({ message: 'Failed to fetch deliverables' });
    }
};

export const createContentDeliverable = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { client_id, title, type, status, link, notes } = req.body;

        const deliverable = await prisma.contentDeliverable.create({
            data: {
                client_id,
                user_id: user.id,
                title,
                type,
                status,
                file_url: link,
                feedback: notes
            }
        });
        await prisma.task.create({ data: { title: 'Created Deliverable: ' + title, description: 'Content deliverable created.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.status(201).json(deliverable);
    } catch (error) {
        console.error('Error creating deliverable:', error);
        res.status(500).json({ message: 'Failed to create deliverable' });
    }
};

export const updateContentDeliverable = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as any;
        const { status, link, notes, title, file_url, feedback } = req.body;

        const deliverable = await prisma.contentDeliverable.update({
            where: { id },
            data: {
                user_id: user.id,
                status,
                file_url: file_url || link,
                feedback: feedback || notes,
                title
            }
        });
        await prisma.task.create({ data: { title: 'Updated Deliverable: ' + title, description: 'Content deliverable updated.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: deliverable.client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.json(deliverable);
    } catch (error) {
        console.error('Error updating deliverable:', error);
        res.status(500).json({ message: 'Failed to update deliverable' });
    }
};

export const deleteContentDeliverable = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.contentDeliverable.delete({ where: { id } });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting deliverable:', error);
        res.status(500).json({ message: 'Failed to delete deliverable' });
    }
};
// --- MARKETING GROUPS ---

export const getMarketingGroups = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: "Access Denied: Invalid Client Context" });

        const groups = await prisma.marketingGroup.findMany({
            where: { client_id: clientId },
            orderBy: { name: 'asc' }
        });
        res.json(groups);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createMarketingGroup = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: "Access Denied: Invalid Client Context" });

        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Group name is required" });

        const group = await prisma.marketingGroup.create({
            data: {
                name,
                client_id: clientId
            }
        });
        res.json(group);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "Group with this name already exists for this client." });
        }
        res.status(500).json({ message: error.message });
    }
};

// ... existing code ... (keeping exports below)
