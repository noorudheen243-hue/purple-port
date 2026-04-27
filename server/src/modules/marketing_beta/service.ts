import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const syncBetaCampaigns = async (clientId?: string) => {
    // 1. Fetch campaigns from the main MarketingCampaign table safely (or Meta Ads directly)
    // To ensure idempotency and safety, we clone them to the beta table
    const existingCampaigns = await prisma.marketingCampaign.findMany({
        where: clientId ? { clientId } : undefined
    });

    // 2. Iterate and upsert into the Beta table safely
    for (const campaign of existingCampaigns) {
        await prisma.marketingCampaignBeta.upsert({
            where: { external_campaign_id: campaign.externalCampaignId },
            update: {
                start_date: campaign.startDate,
                end_date: campaign.ends,
                clientId: campaign.clientId,
                groupId: campaign.group_id,
            },
            create: {
                external_campaign_id: campaign.externalCampaignId,
                campaign_name: campaign.name,
                status: campaign.status || 'ACTIVE',
                spend: campaign.budget || 0,
                results: 0,
                start_date: campaign.startDate,
                end_date: campaign.ends,
                clientId: campaign.clientId,
                groupId: campaign.group_id,
            }
        });
    }

    // Create an Automation Log for the sync
    await prisma.automationLogBeta.create({
        data: {
            trigger_event: 'MANUAL_SYNC',
            action_suggested: 'System updated campaign lists from Meta Ads.',
            related_entity_type: 'SYSTEM',
            related_entity_id: 'N/A'
        }
    });

    // 3. Scan for anomalies (AI intelligence Mock)
    const betaCampaigns = await prisma.marketingCampaignBeta.findMany();

    for (const bCamp of betaCampaigns) {
        if (bCamp.spend > 1000 && bCamp.results < 5) {
            // Check if insight already exists to avoid spamming
            const existingAlert = await prisma.aiInsightBeta.findFirst({
                where: { campaign_id: bCamp.id, type: 'ANOMALY' }
            });
            if (!existingAlert) {
                await prisma.aiInsightBeta.create({
                    data: {
                        campaign_id: bCamp.id,
                        type: 'ANOMALY',
                        message: `High spend detected with low results on campaign: ${bCamp.campaign_name}`,
                    }
                });

                await prisma.automationLogBeta.create({
                    data: {
                        trigger_event: 'AI_ANOMALY_DETECTED',
                        action_suggested: 'Alerted admin about underperforming campaign constraints.',
                        related_entity_type: 'CAMPAIGN',
                        related_entity_id: bCamp.id
                    }
                });
            }
        }
    }

    return { success: true, count: existingCampaigns.length };
};

export const getBetaCampaigns = async (clientId?: string, groupId?: string) => {
    if (!clientId) return [];
    return await prisma.marketingCampaignBeta.findMany({
        where: { 
            clientId,
            groupId: groupId || undefined
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const getBetaInsights = async (clientId?: string) => {
    return await prisma.aiInsightBeta.findMany({
        where: clientId ? { campaign: { clientId } } : undefined,
        include: { campaign: true },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
};

export const getBetaAutomations = async (clientId?: string) => {
    return await prisma.automationLogBeta.findMany({
        where: clientId ? { 
            OR: [
                { related_entity_type: 'CAMPAIGN', related_entity_id: { in: (await prisma.marketingCampaignBeta.findMany({ where: { clientId }, select: { id: true } })).map(c => c.id) } },
                { related_entity_type: 'SYSTEM' } // Show system logs to everyone for now, or filter by logic
            ]
        } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 50
    });
};
export const getMarketingGroups = async (clientId: string) => {
    return await prisma.marketingGroup.findMany({
        where: { client_id: clientId },
        orderBy: { name: 'asc' }
    });
};
