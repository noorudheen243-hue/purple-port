import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to determine if user is CRM user or Main App user
// Assume req.user has role, but req.crmUser exists if authenticated via crmMiddleware
const isAppUser = (req: any) => {
    return !!req.user;
};

// 1. Dashboard Stats
export const getV2DashboardStats = async (req: any, res: Response) => {
    try {
        const client_id = req.user?.client_id || req.crmUser?.client_id || req.user?.id;
        const crm_group_id = req.crmUser?.crm_group_id; // Filter by assigned group if CRM user
        
        const groupFilter = crm_group_id ? { id: crm_group_id } : {};
        const leadGroupFilter = crm_group_id ? { crm_group_id } : {};

        const totalGroups = await prisma.crmGroup.count({ where: { client_id, ...groupFilter } });
        const totalLeads = await prisma.crmLead.count({ where: { client_id, ...leadGroupFilter } });
        const qualifiedLeads = await prisma.crmLead.count({ where: { client_id, ...leadGroupFilter, quality: { in: ['Warm', 'Hot'] } } });
        const convertedLeads = await prisma.crmLead.count({ where: { client_id, ...leadGroupFilter, stage: 'Converted' } });

        const followUpsDue = await prisma.crmFollowup.count({
            where: {
                lead: { client_id, ...leadGroupFilter },
                next_followup: { lte: new Date() }
            }
        });

        const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0;

        res.json({
            success: true,
            data: {
                totalGroups,
                totalLeads,
                qualifiedLeads,
                convertedLeads,
                followUpsDue,
                conversionRate: `${conversionRate}%`
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Groups
export const getV2Groups = async (req: any, res: Response) => {
    try {
        const client_id = req.user?.client_id || req.crmUser?.client_id || req.user?.id;
        const groups = await prisma.crmGroup.findMany({
            where: { client_id },
            include: {
                campaigns: { include: { campaign: true } },
                _count: { select: { leads: true } }
            }
        });
        res.json({ success: true, data: groups });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createV2Group = async (req: any, res: Response) => {
    try {
        const client_id = req.user?.client_id || req.crmUser?.client_id || req.user?.id;
        const { name } = req.body;
        const newGroup = await prisma.crmGroup.create({
            data: { name, client_id }
        });
        res.json({ success: true, data: newGroup });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Leads
export const getV2Leads = async (req: any, res: Response) => {
    try {
        const client_id = req.user?.client_id || req.crmUser?.client_id || req.user?.id;
        const crm_group_id = req.crmUser?.crm_group_id; 

        const leads = await prisma.crmLead.findMany({
            where: {
                client_id,
                ...(crm_group_id ? { crm_group_id } : {})
            },
            include: {
                crmGroup: true,
                campaign: true,
                followups: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: leads });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createV2Lead = async (req: any, res: Response) => {
    try {
        const client_id = req.user?.client_id || req.crmUser?.client_id || req.user?.id;
        const { name, contact_number, email, location, crm_group_id, campaign_id, quality, stage, notes } = req.body;

        const newLead = await prisma.crmLead.create({
            data: {
                client_id,
                name,
                contact_number,
                whatsapp_number: contact_number,
                email,
                location,
                crm_group_id,
                campaign_id,
                quality,
                stage,
                notes,
                source: 'Manual'
            }
        });
        res.json({ success: true, data: newLead });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateV2Lead = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const updatedLead = await prisma.crmLead.update({
            where: { id },
            data: updateData
        });
        res.json({ success: true, data: updatedLead });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Follow-Ups
export const addV2Followup = async (req: any, res: Response) => {
    try {
        const { id } = req.params; // lead id
        const { channel, stage, quality, notes, next_followup } = req.body;
        const crm_user_id = req.crmUser?.id || null; // Null if done by main app user

        // Update lead stage and quality
        await prisma.crmLead.update({
            where: { id },
            data: { stage, quality }
        });

        const newFollowup = await prisma.crmFollowup.create({
            data: {
                lead_id: id,
                crm_user_id,
                channel,
                stage,
                quality,
                notes,
                next_followup: next_followup ? new Date(next_followup) : null
            }
        });
        
        res.json({ success: true, data: newFollowup });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Campaign Financial Performance (App Users Only)
export const getV2CampaignPerformance = async (req: any, res: Response) => {
    try {
        if (!isAppUser(req)) {
            return res.status(403).json({ success: false, message: "Restricted: Financial metrics are not available to CRM users." });
        }
        
        // Example mock return or real data fetched from Google/Meta logs
        res.json({
            success: true,
            data: [
                { campaignName: "Sample Ad", spend: 500, conversionValue: 1500, ROAS: 3.0, CPL: 15 }
            ]
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
