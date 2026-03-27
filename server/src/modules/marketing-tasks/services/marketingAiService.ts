import prisma from '../../../utils/prisma';

export interface OptimizationTip {
    type: 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'INSIGHT';
    title: string;
    message: string;
    actionable: string;
}

export class MarketingAIService {
    /**
     * Generates optimization tips based on campaign metrics.
     * In a production environment, this could call an LLM (Gemini/OpenAI) 
     * with the metrics as context. For now, it uses a smart rule-based engine.
     */
    public static async generateTips(clientId: string): Promise<OptimizationTip[]> {
        const tips: OptimizationTip[] = [];

        // Fetch recent metrics for the client (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const campaigns = await (prisma as any).marketingCampaign.findMany({
            where: { clientId, status: { in: ['ACTIVE', 'ENABLED'] } },
            include: {
                marketingMetrics: {
                    where: { date: { gte: thirtyDaysAgo } },
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (campaigns.length === 0) {
            tips.push({
                type: 'INSIGHT',
                title: 'Data Collection Starting',
                message: 'We are monitoring your campaigns. Tips will appear here once significant performance data is gathered.',
                actionable: 'Ensure your Meta and Google accounts are correctly linked.'
            });
            return tips;
        }

        for (const camp of campaigns) {
            const metrics = camp.marketingMetrics || [];
            if (metrics.length === 0) continue;

            const totalSpend = metrics.reduce((acc: number, m: any) => acc + (m.spend || 0), 0);
            const totalImpressions = metrics.reduce((acc: number, m: any) => acc + (m.impressions || 0), 0);
            const totalClicks = metrics.reduce((acc: number, m: any) => acc + (m.clicks || 0), 0);
            const totalResults = metrics.reduce((acc: number, m: any) => acc + (m.results || 0), 0);
            const totalConversations = metrics.reduce((acc: number, m: any) => acc + (m.conversations || 0), 0);

            const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
            const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
            const costPerResult = totalResults > 0 ? totalSpend / totalResults : 0;

            // --- AI RULES ---

            // 1. High CPM / Low CTR
            if (totalImpressions > 1000 && avgCTR < 0.5) {
                tips.push({
                    type: 'WARNING',
                    title: `Low Engagement: ${camp.name}`,
                    message: `Your Click-Through Rate (CTR) is currently ${avgCTR.toFixed(2)}%, which is below the industry average for ${camp.platform}.`,
                    actionable: 'Try refreshing your ad creatives or refining your target audience interests to improve relevance.'
                });
            }

            // 2. High Cost Per Result
            if (totalResults > 3 && costPerResult > 500) { // Arbitrary threshold for demo
                tips.push({
                    type: 'CRITICAL',
                    title: `High Cost per Result: ${camp.name}`,
                    message: `You are spending ₹${costPerResult.toFixed(0)} per result. This may impact your overall ROI.`,
                    actionable: 'Analyze which ad sets are underperforming and consider reallocating budget to the top-performing variations.'
                });
            }

            // 3. Messaging Potential
            if (totalConversations > 0 && totalConversations < totalResults * 0.2) {
                tips.push({
                    type: 'INSIGHT',
                    title: 'Conversational Opportunity',
                    message: 'Your campaign is generating leads, but messaging engagement is relatively low.',
                    actionable: 'Consider adding a "Send Message" call-to-action to capture users who prefer direct chat over forms.'
                });
            }

            // 4. Good Performance Scaling
            if (avgCTR > 2.0 && totalResults > 10) {
                tips.push({
                    type: 'SUCCESS',
                    title: `Top Performer: ${camp.name}`,
                    message: `This campaign is performing exceptionally well with a ${avgCTR.toFixed(2)}% CTR.`,
                    actionable: 'Consider increasing the daily budget by 10-15% to scale your success while monitoring ROI.'
                });
            }
        }

        // Global Insight if no specific risks found
        if (tips.length === 0) {
            tips.push({
                type: 'INSIGHT',
                title: 'Steady Performance',
                message: 'Your active campaigns are maintaining stable metrics within expected ranges.',
                actionable: 'Continue monitoring daily trends for any sudden shifts in CPM or frequency.'
            });
        }

        return tips.slice(0, 5); // Limit to top 5 tips
    }
}
