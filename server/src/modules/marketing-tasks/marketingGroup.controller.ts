import { Request, Response } from 'express';
import prisma from '../../utils/prisma';

export const getGroups = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.query;
        const where: any = {};
        if (clientId) where.client_id = clientId as string;

        const groups = await prisma.marketingGroup.findMany({
            where,
            include: {
                _count: {
                    select: { campaigns: true, leads: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(groups);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createGroup = async (req: Request, res: Response) => {
    try {
        const { name, client_id } = req.body;
        if (!name || !client_id) {
            return res.status(400).json({ error: 'Name and Client ID are required' });
        }

        const group = await prisma.marketingGroup.create({
            data: { name, client_id }
        });

        res.status(201).json(group);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateGroup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const group = await prisma.marketingGroup.update({
            where: { id },
            data: { name }
        });

        res.json(group);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteGroup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // Remove relationships before deleting? 
        // No, Prisma relation should be handled if we set it as optional.
        await prisma.marketingGroup.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const assignCampaignsToGroup = async (req: Request, res: Response) => {
    try {
        const { groupId, campaignIds } = req.body;
        if (!groupId || !Array.isArray(campaignIds)) {
            return res.status(400).json({ error: 'Group ID and Campaign IDs array are required' });
        }

        // Update all campaigns to this group
        await prisma.marketingCampaign.updateMany({
            where: { id: { in: campaignIds } },
            data: { group_id: groupId }
        });

        // Also update any leads associated with these campaigns to this group
        await prisma.lead.updateMany({
            where: { campaignId: { in: campaignIds } },
            data: { group_id: groupId }
        });

        res.json({ success: true, message: `Assigned ${campaignIds.length} campaigns and their leads to the group.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const unassignCampaignFromGroup = async (req: Request, res: Response) => {
    try {
        const { campaignId } = req.body;
        if (!campaignId) {
            return res.status(400).json({ error: 'Campaign ID is required' });
        }

        // Unassign campaign
        await prisma.marketingCampaign.update({
            where: { id: campaignId },
            data: { group_id: null }
        });

        // Also unassign leads derived from this campaign
        await prisma.lead.updateMany({
            where: { campaignId: campaignId },
            data: { group_id: null }
        });

        res.json({ success: true, message: 'Campaign unassigned from group successfully.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
