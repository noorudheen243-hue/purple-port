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

export const getLeads = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: "Access Denied: Invalid Client Context" });

        const leads = await prisma.lead.findMany({
            where: { client_id: clientId },
            include: { follow_ups: { orderBy: { follow_up_number: 'asc' } } },
            orderBy: { date: 'desc' }
        });
        res.json(leads);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createLead = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: "Access Denied: Invalid Client Context" });

        const { date, campaign_name, phone, name, address, quality, status, follow_ups } = req.body;

        const lead = await prisma.lead.create({
            data: {
                client_id: clientId,
                date: date ? new Date(date) : undefined,
                campaign_name,
                phone,
                name,
                address,
                quality,
                status,
                follow_ups: {
                    create: follow_ups?.map((f: any) => ({
                        follow_up_number: f.follow_up_number,
                        status: f.status,
                        notes: f.notes,
                        channel: f.channel || 'Phone Call',
                        date: f.date ? new Date(f.date) : new Date()
                    }))
                }
            },
            include: { follow_ups: true }
        });
        res.json(lead);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateLead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: "Access Denied: Invalid Client Context" });

        const { date, campaign_name, phone, name, address, quality, status, follow_ups } = req.body;

        const lead = await prisma.lead.update({
            where: { id },
            data: {
                date: date ? new Date(date) : undefined,
                campaign_name,
                phone,
                name,
                address,
                quality,
                status
            }
        });

        if (follow_ups) {
            // Simple sync: delete old and create new
            await prisma.leadFollowUp.deleteMany({ where: { lead_id: id } });
            if (follow_ups.length > 0) {
                await prisma.leadFollowUp.createMany({
                    data: follow_ups.map((f: any) => ({
                        lead_id: id,
                        follow_up_number: f.follow_up_number,
                        status: f.status,
                        notes: f.notes,
                        channel: f.channel || 'Phone Call',
                        date: f.date ? new Date(f.date) : new Date()
                    }))
                });
            }
        }

        const updatedLead = await prisma.lead.findUnique({
            where: { id },
            include: { follow_ups: { orderBy: { follow_up_number: 'asc' } } }
        });

        res.json(updatedLead);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteLead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const lead = await prisma.lead.findUnique({ where: { id } });
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        const user = req.user as any;
        if (user.role === 'CLIENT' && lead.client_id !== user.linked_client_id) {
            return res.status(403).json({ message: "Access Denied" });
        }

        await prisma.lead.delete({ where: { id } });
        res.json({ message: "Deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
