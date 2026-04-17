import prisma from '../../../utils/prisma';
import { AiSalesEngineService } from './aiSalesEngine.service';

export class DealService {
    static async createDeal(data: any) {
        const deal = await prisma.deal.create({
            data: {
                title: data.title,
                description: data.description,
                value: data.value,
                stage: data.stage || 'DISCOVERY',
                clientId: data.clientId,
                leadId: data.leadId,
                expected_close_date: data.expected_close_date ? new Date(data.expected_close_date) : null,
            }
        });

        // Trigger AI Prediction immediately
        await AiSalesEngineService.predictDealProbability(deal.id);
        
        return deal;
    }

    static async getDeals(clientId?: string) {
        const where: any = {};
        if (clientId) where.clientId = clientId;

        return await prisma.deal.findMany({
            where,
            include: {
                client: { select: { name: true } },
                aiPrediction: true
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    static async updateDeal(id: string, data: any) {
        const deal = await prisma.deal.update({
            where: { id },
            data: {
                ...data,
                expected_close_date: data.expected_close_date ? new Date(data.expected_close_date) : undefined,
            }
        });

        // Recalculate AI prediction on update
        await AiSalesEngineService.predictDealProbability(deal.id);
        
        return deal;
    }

    static async getDealById(id: string) {
        return await prisma.deal.findUnique({
            where: { id },
            include: {
                client: true,
                lead: true,
                aiPrediction: true,
                aiSuggestions: true
            }
        });
    }
}
