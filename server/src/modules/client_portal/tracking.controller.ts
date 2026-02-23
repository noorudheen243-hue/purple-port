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
            orderBy: { date: 'desc' }
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createMetaAdsLog = async (req: Request, res: Response) => {
    try {
        const { client_id, campaign_name, objective, platform, spend, status, results_json, notes, date } = req.body;

        const log = await prisma.metaAdsLog.create({
            data: {
                client_id,
                campaign_name,
                objective,
                platform,
                spend: parseFloat(spend || 0),
                results_json: typeof results_json === 'object' ? JSON.stringify(results_json) : results_json,
                notes,
                date: date ? new Date(date) : undefined
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
        const { campaign_name, objective, platform, spend, status, results_json, notes, date } = req.body;

        const log = await prisma.metaAdsLog.update({
            where: { id },
            data: {
                campaign_name,
                objective,
                platform,
                spend: parseFloat(spend || 0),
                status: status || 'ACTIVE',
                results_json: typeof results_json === 'object' ? JSON.stringify(results_json) : results_json,
                notes,
                date: date ? new Date(date) : undefined
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
            orderBy: { date: 'desc' }
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createGoogleAdsLog = async (req: Request, res: Response) => {
    try {
        const { client_id, campaign_name, campaign_type, spend, status, clicks, impressions, conversions, cpa, notes, date } = req.body;

        const log = await prisma.googleAdsLog.create({
            data: {
                client_id,
                campaign_name,
                campaign_type,
                spend: parseFloat(spend || 0),
                status: status || 'ACTIVE',
                clicks: parseInt(clicks || 0),
                impressions: parseInt(impressions || 0),
                conversions: parseInt(conversions || 0),
                cpa: parseFloat(cpa || 0),
                notes,
                date: date ? new Date(date) : undefined
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
        const { campaign_name, campaign_type, spend, status, clicks, impressions, conversions, cpa, notes, date } = req.body;

        const log = await prisma.googleAdsLog.update({
            where: { id },
            data: {
                campaign_name,
                campaign_type,
                spend: parseFloat(spend || 0),
                status: status || 'ACTIVE',
                clicks: parseInt(clicks || 0),
                impressions: parseInt(impressions || 0),
                conversions: parseInt(conversions || 0),
                cpa: parseFloat(cpa || 0),
                notes,
                date: date ? new Date(date) : undefined
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
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createSeoLog = async (req: Request, res: Response) => {
    try {
        const { client_id, month, year, status, activities_json, keyword_rankings_json, organic_traffic, summary } = req.body;

        const log = await prisma.seoLog.upsert({
            where: {
                client_id_month_year: {
                    client_id,
                    month: parseInt(month),
                    year: parseInt(year)
                }
            },
            update: {
                status: status || 'ACTIVE',
                activities_json: typeof activities_json === 'object' ? JSON.stringify(activities_json) : activities_json,
                keyword_rankings_json: typeof keyword_rankings_json === 'object' ? JSON.stringify(keyword_rankings_json) : keyword_rankings_json,
                organic_traffic: parseInt(organic_traffic || 0),
                summary
            },
            create: {
                client_id,
                month: parseInt(month),
                year: parseInt(year),
                status: status || 'ACTIVE',
                activities_json: typeof activities_json === 'object' ? JSON.stringify(activities_json) : activities_json,
                keyword_rankings_json: typeof keyword_rankings_json === 'object' ? JSON.stringify(keyword_rankings_json) : keyword_rankings_json,
                organic_traffic: parseInt(organic_traffic || 0),
                summary
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
        const { month, year, status, activities_json, keyword_rankings_json, organic_traffic, summary } = req.body;

        const log = await prisma.seoLog.update({
            where: { id },
            data: {
                month: parseInt(month),
                year: parseInt(year),
                status: status || 'ACTIVE',
                activities_json: typeof activities_json === 'object' ? JSON.stringify(activities_json) : activities_json,
                keyword_rankings_json: typeof keyword_rankings_json === 'object' ? JSON.stringify(keyword_rankings_json) : keyword_rankings_json,
                organic_traffic: parseInt(organic_traffic || 0),
                summary
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
        const { client_id, project_name, status, milestones_json, timeline_json, staging_url, live_url } = req.body;

        const project = await prisma.webDevProject.create({
            data: {
                client_id,
                project_name,
                status,
                milestones_json: typeof milestones_json === 'object' ? JSON.stringify(milestones_json) : milestones_json,
                timeline_json: typeof timeline_json === 'object' ? JSON.stringify(timeline_json) : timeline_json,
                staging_url,
                live_url
            }
        });
        res.json(project);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateWebProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
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
            data
        });
        res.json(project);
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
        const { client_id, title, type, status, link, notes } = req.body;

        const deliverable = await prisma.contentDeliverable.create({
            data: {
                client_id,
                title,
                type,
                status,
                file_url: link,
                feedback: notes
            }
        });

        res.status(201).json(deliverable);
    } catch (error) {
        console.error('Error creating deliverable:', error);
        res.status(500).json({ message: 'Failed to create deliverable' });
    }
};

export const updateContentDeliverable = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, link, notes, title } = req.body;

        const deliverable = await prisma.contentDeliverable.update({
            where: { id },
            data: {
                status,
                file_url: link,
                feedback: notes,
                title
            }
        });

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
