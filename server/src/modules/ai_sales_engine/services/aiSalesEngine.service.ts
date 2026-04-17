import prisma from '../../../utils/prisma';
import { differenceInHours, differenceInDays } from 'date-fns';

export class AiSalesEngineService {
    /**
     * Lead Scoring System
     * Calculates a 0-100 score based on source, engagement, and response time.
     */
    static async calculateLeadScore(leadId: string) {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { follow_ups: true }
        });

        if (!lead) return null;

        let score = 50; // Neutral starting point
        const factors: string[] = [];

        // 1. Source Factor
        if (lead.source === 'Meta') {
            score += 10;
            factors.push('Source: Meta (+10)');
        } else if (lead.source === 'Website') {
            score += 5;
            factors.push('Source: Website (+5)');
        } else if (lead.source === 'Referral') {
            score += 15;
            factors.push('Source: Referral (+15)');
        }

        // 2. Engagement Level
        const followupCount = lead.follow_ups.length;
        if (followupCount > 0) {
            const bonus = Math.min(followupCount * 5, 20);
            score += bonus;
            factors.push(`Engagement: ${followupCount} interactions (+${bonus})`);
        }

        // 3. Response Time (Speed to Lead)
        if (lead.follow_ups.length > 0) {
            const firstFollowup = lead.follow_ups[lead.follow_ups.length - 1]; // Assuming oldest is first? Let's check dates.
            // Actually, let's sort them.
            const sorted = [...lead.follow_ups].sort((a, b) => a.date.getTime() - b.date.getTime());
            const firstOne = sorted[0];
            const hours = differenceInHours(new Date(firstOne.date), new Date(lead.date));
            if (hours <= 24) {
                score += 15;
                factors.push('Speed to Lead: Contacted within 24h (+15)');
            }
        }

        // 4. Quality Field
        if (lead.quality === 'HIGH') {
            score += 10;
            factors.push('Quality: High marked by staff (+10)');
        }

        // Cap score
        score = Math.min(Math.max(score, 0), 100);

        let label = 'COLD';
        if (score >= 80) label = 'HOT';
        else if (score >= 50) label = 'WARM';

        return await prisma.aiLeadScore.upsert({
            where: { leadId },
            update: {
                score,
                label,
                factors_json: JSON.stringify(factors),
                last_calculated: new Date()
            },
            create: {
                leadId,
                score,
                label,
                factors_json: JSON.stringify(factors)
            }
        });
    }

    /**
     * Deal Win Probability
     * Predicts percentage based on stage, interactions, and age.
     */
    static async predictDealProbability(dealId: string) {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: { lead: { include: { follow_ups: true } } }
        });

        if (!deal) return null;

        let prob = 0.1; // Default 10%

        // 1. Stage Probability
        const stageProbs: Record<string, number> = {
            'DISCOVERY': 0.1,
            'QUALIFICATION': 0.3,
            'PROPOSAL': 0.5,
            'NEGOTIATION': 0.7,
            'CLOSING': 0.9
        };
        prob = stageProbs[deal.stage] || 0.1;

        const factors: string[] = [`Base stage probability (${(prob * 100).toFixed(0)}%)`];

        // 2. Engagement adjustment
        if (deal.lead?.follow_ups) {
            const count = deal.lead.follow_ups.length;
            const boost = Math.min(count * 0.02, 0.1);
            prob += boost;
            if (boost > 0) factors.push(`Interaction boost (+${(boost * 100).toFixed(0)}%)`);
        }

        // 3. Stale Check
        const age = differenceInDays(new Date(), new Date(deal.updatedAt));
        if (age > 7) {
            const penalty = Math.min((age - 7) * 0.01, 0.2);
            prob -= penalty;
            factors.push(`Risk: Inactive for ${age} days (-${(penalty * 100).toFixed(0)}%)`);
        }

        prob = Math.min(Math.max(prob, 0), 0.99);

        let riskLevel = 'LOW';
        if (age > 10 || prob < 0.3) riskLevel = 'HIGH';
        else if (age > 5 || prob < 0.5) riskLevel = 'MEDIUM';

        return await prisma.aiDealPrediction.upsert({
            where: { dealId },
            update: {
                probability: prob,
                risk_level: riskLevel,
                factors_json: JSON.stringify(factors),
                last_calculated: new Date()
            },
            create: {
                dealId,
                probability: prob,
                risk_level: riskLevel,
                factors_json: JSON.stringify(factors)
            }
        });
    }

    /**
     * Revenue Forecasting
     */
    static async getRevenueForecast(clientId?: string) {
        const where: any = { status: 'OPEN' };
        if (clientId) where.clientId = clientId;

        const deals = await prisma.deal.findMany({
            where,
            include: { aiPrediction: true }
        });

        let totalExpected = 0;
        let totalPipeline = 0;

        deals.forEach(deal => {
            totalPipeline += deal.value;
            const prob = deal.aiPrediction?.probability || 0.2;
            totalExpected += deal.value * prob;
        });

        // If filtering by client, we return the live calculation without upserting to global forecast table
        if (clientId) {
            return {
                expected_revenue: totalExpected,
                pipeline_value: totalPipeline,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear()
            };
        }

        const now = new Date();
        return await prisma.aiForecast.upsert({
            where: {
                month_year: {
                    month: now.getMonth() + 1,
                    year: now.getFullYear()
                }
            },
            update: {
                expected_revenue: totalExpected,
                pipeline_value: totalPipeline,
                data_json: JSON.stringify({ dealCount: deals.length })
            },
            create: {
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                expected_revenue: totalExpected,
                pipeline_value: totalPipeline,
                data_json: JSON.stringify({ dealCount: deals.length })
            }
        });
    }

    /**
     * Generate Smart Follow-up Suggestions
     */
    static async generateSuggestions() {
        // Find leads with no followup in 5 days
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        const staleLeads = await prisma.lead.findMany({
            where: {
                status: 'NEW',
                updatedAt: { lt: fiveDaysAgo }
            }
        });

        for (const lead of staleLeads) {
            await prisma.aiFollowupSuggestion.create({
                data: {
                    leadId: lead.id,
                    suggested_date: new Date(),
                    suggested_type: 'CALL',
                    reason: 'Lead inactive for 5 days — re-engage'
                }
            });
        }

        return { count: staleLeads.length };
    }
}
