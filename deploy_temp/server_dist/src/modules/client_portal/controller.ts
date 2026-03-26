import { Request, Response } from 'express';
import prisma from '../../utils/prisma';
import * as ingestionService from '../ad_intelligence/service';

// --- APPROVAL WORKFLOWS ---

export const getPendingApprovals = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        let clientId = user.linked_client_id;

        // Admin override
        if (req.query.clientId && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
            clientId = req.query.clientId as string;
        }

        if (!clientId) return res.status(400).json({ message: "Client Context Required" });

        // Logic:
        // Client: Only sees SUBMITTED items (waiting for their approval).
        // Admin: Sees DRAFT (to submit), SUBMITTED (to retract/edit), REJECTED (to fix).

        let statusFilter: any = { in: ['SUBMITTED'] }; // Default for Client

        if (user.role === 'ADMIN' || user.role === 'MANAGER') {
            // Admin sees everything active pending action or draft
            statusFilter = { in: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'] };
        }

        const pendingContent = await prisma.contentDeliverable.findMany({
            where: {
                client_id: clientId,
                status: statusFilter
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ content: pendingContent });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateApprovalStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, feedback } = req.body;
        const user = req.user as any;

        // Valid Transitions
        // Client can: APPROVE, CHANGES_REQUESTED, REJECT (if SUBMITTED)
        // Admin can: SUBMIT (from DRAFT), REJECT, APPROVE (internal override)

        await prisma.contentDeliverable.update({
            where: { id },
            data: {
                status,
                feedback,
                approver_id: user.id
            }
        });

        res.json({ message: 'Status updated' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- SERVICE CONFIGURATION ---

export const updateServices = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        const { services } = req.body; // e.g. ['META_ADS', 'SEO']

        const client = await prisma.client.update({
            where: { id: clientId },
            data: {
                service_engagement: JSON.stringify(services)
            }
        });

        res.json({ message: 'Services updated', services: JSON.parse(client.service_engagement || '[]') });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getServices = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        const client = await prisma.client.findUnique({ where: { id: clientId } });

        if (!client) return res.status(404).json({ message: "Client not found" });

        const services = client.service_engagement ? JSON.parse(client.service_engagement) : [];
        res.json({ services });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- PORTAL DATA AGGREGATION ---

export const getPortalDashboard = async (req: Request, res: Response) => {
    try {
        // 1. Identify Client
        const user = req.user as any;
        let clientId = user.linked_client_id;
        if (req.query.clientId && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
            clientId = req.query.clientId as string;
        }
        if (!clientId) return res.status(400).json({ message: "Client Context Required" });

        // 2. Get Client Settings
        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) return res.status(404).json({ message: "Client not found" });

        const services = client.service_engagement ? JSON.parse(client.service_engagement) : [];

        // 3. Fetch Data per Service
        const dashboardData: any = { services };

        if (services.includes('META_ADS')) {
            // Get total spend and last campaign
            const metaAgg = await prisma.metaAdsLog.aggregate({
                where: { client_id: clientId },
                _sum: { spend: true }
            });
            const lastMeta = await prisma.metaAdsLog.findFirst({
                where: { client_id: clientId },
                orderBy: { date: 'desc' }
            });
            dashboardData.meta_ads = {
                total_spend: metaAgg._sum.spend || 0,
                last_campaign: lastMeta?.campaign_name || 'No Data'
            };
        }

        if (services.includes('GOOGLE_ADS')) {
            const googleAgg = await prisma.googleAdsLog.aggregate({
                where: { client_id: clientId },
                _sum: { spend: true, conversions: true }
            });
            dashboardData.google_ads = {
                total_spend: googleAgg._sum.spend || 0,
                conversions: googleAgg._sum.conversions || 0
            };
        }

        if (services.includes('SEO')) {
            const lastSeo = await prisma.seoLog.findFirst({
                where: { client_id: clientId },
                orderBy: [{ year: 'desc' }, { month: 'desc' }]
            });
            dashboardData.seo = {
                traffic: lastSeo?.organic_traffic || 0,
                month: lastSeo ? `${lastSeo.month}/${lastSeo.year}` : '-'
            };
        }

        if (services.includes('WEB_DEV')) {
            const activeProject = await prisma.webDevProject.findFirst({
                where: { client_id: clientId, status: { not: 'DEPLOYED' } },
                orderBy: { updatedAt: 'desc' }
            });
            dashboardData.web_dev = {
                active_project: activeProject?.project_name || 'None',
                status: activeProject?.status || 'Idle'
            };
        }

        if (services.includes('CONTENT') || services.includes('BRANDING')) {
            const pendingParams = { in: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'] };
            const pendingCount = await prisma.contentDeliverable.count({
                where: { client_id: clientId, status: pendingParams }
            });
            dashboardData.content = {
                pending_items: pendingCount
            };
        }

        res.json(dashboardData);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- GLOBAL PORTAL STATS (ADMIN DASHBOARD) ---

export const getGlobalPortalStats = async (req: Request, res: Response) => {
    try {
        const [metaAgg, googleAgg, pendingContent, activeWebProjects, seoClients] = await Promise.all([
            // 1. Meta Ads Total Spend
            prisma.metaAdsLog.aggregate({ _sum: { spend: true } }),

            // 2. Google Ads Total Spend
            prisma.googleAdsLog.aggregate({ _sum: { spend: true } }),

            // 3. Pending Content Items
            prisma.contentDeliverable.count({
                where: { status: { in: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'] } }
            }),

            // 4. Active Web Projects
            prisma.webDevProject.count({
                where: { status: { not: 'DEPLOYED' } }
            }),

            // 5. SEO Clients
            prisma.client.count({
                where: { service_engagement: { contains: 'SEO' } }
            })
        ]);

        res.json({
            meta_spend: metaAgg._sum.spend || 0,
            google_spend: googleAgg._sum.spend || 0,
            pending_content: pendingContent,
            active_web_projects: activeWebProjects,
            seo_clients: seoClients
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
