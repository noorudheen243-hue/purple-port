import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

export const createCampaign = async (data: Prisma.CampaignCreateInput) => {
    return await prisma.campaign.create({
        data,
    });
};

export const getCampaigns = async (clientId?: string, month?: string) => {
    const where: Prisma.CampaignWhereInput = {};

    if (clientId) {
        where.client_id = clientId;
    }

    if (month) {
        const date = new Date(month);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        where.start_date = { gte: start };
        where.end_date = { lte: end };
    }

    return await prisma.campaign.findMany({
        where,
        orderBy: { start_date: 'desc' },
        include: {
            client: { select: { name: true } },
            _count: { select: { tasks: true } }
        }
    });
};

export const getCampaignById = async (id: string) => {
    return await prisma.campaign.findUnique({
        where: { id },
        include: {
            tasks: {
                include: {
                    assignee: { select: { full_name: true, avatar_url: true } },
                    _count: { select: { comments: true, assets: true } }
                },
                orderBy: { priority: 'desc' }
            }
        }
    });
};

export const updateCampaign = async (id: string, data: Prisma.CampaignUpdateInput) => {
    return await prisma.campaign.update({
        where: { id },
        data,
    });
};
