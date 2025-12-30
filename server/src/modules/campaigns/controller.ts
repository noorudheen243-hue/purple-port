import { Request, Response } from 'express';
import { z } from 'zod';
import * as campaignService from './service';

const createCampaignSchema = z.object({
    title: z.string().min(2),
    client_id: z.string().uuid(),
    start_date: z.string().transform(str => new Date(str)),
    end_date: z.string().transform(str => new Date(str)),
    goals: z.string().optional(),
    budget: z.number().optional(),
});

export const createCampaign = async (req: Request, res: Response) => {
    try {
        const validatedData = createCampaignSchema.parse(req.body);

        // Ensure client exists? Prisma will throw if not, but good to check.
        // For now relying on Prisma constraints.

        const campaign = await campaignService.createCampaign({
            title: validatedData.title,
            start_date: validatedData.start_date,
            end_date: validatedData.end_date,
            goals: validatedData.goals,
            budget: validatedData.budget,
            client: { connect: { id: validatedData.client_id } },
        });

        res.status(201).json(campaign);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: error.errors });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
};

export const getCampaigns = async (req: Request, res: Response) => {
    try {
        const { client_id, month } = req.query;
        const campaigns = await campaignService.getCampaigns(
            client_id as string,
            month as string
        );
        res.json(campaigns);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCampaignById = async (req: Request, res: Response) => {
    try {
        const campaign = await campaignService.getCampaignById(req.params.id);
        if (!campaign) {
            res.status(404).json({ message: 'Campaign not found' });
            return;
        }
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCampaign = async (req: Request, res: Response) => {
    try {
        const campaign = await campaignService.updateCampaign(req.params.id, req.body);
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
