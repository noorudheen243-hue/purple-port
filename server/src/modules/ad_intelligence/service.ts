import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

/**
 * Ad Ingestion Service
 * Responsible for fetching data from external APIs (Google/Meta)
 * and storing it in the SpendSnapshot table.
 */

interface AdStats {
    date: Date; // YYYY-MM-DD
    spend_micros: bigint;
    impressions: number;
    clicks: number;
    conversions: number;
    campaign_id: string; // Internal Campaign ID
    ad_account_id: string;
}

export const ingestDailyStats = async (stats: AdStats[]) => {
    // Upsert Logic:
    // If stats for (Date + Campaign) exist, overwrite them (Assume API correction).
    // If not, create new.

    let processed = 0;

    for (const stat of stats) {
        // We use Prisma upsert.
        // Needs a unique compound index on [date, campaign_id]

        await prisma.spendSnapshot.upsert({
            where: {
                date_campaign_id: {
                    date: stat.date,
                    campaign_id: stat.campaign_id
                }
            },
            update: {
                spend_micros: stat.spend_micros,
                impressions: stat.impressions,
                clicks: stat.clicks,
                conversions: stat.conversions,
                ad_account_id: stat.ad_account_id
            },
            create: {
                date: stat.date,
                spend_micros: stat.spend_micros,
                impressions: stat.impressions,
                clicks: stat.clicks,
                conversions: stat.conversions,
                campaign_id: stat.campaign_id,
                ad_account_id: stat.ad_account_id,
                currency: 'INR' // Default for now
            }
        });
        processed++;
    }

    return { processed };
};

export const getLinkedAdAccounts = async (clientId: string) => {
    return await prisma.adAccount.findMany({
        where: { client_id: clientId }
    });
};

export const linkAdAccount = async (data: Prisma.AdAccountCreateInput) => {
    return await prisma.adAccount.create({ data });
};

export const getAggregatedStats = async (startDate: Date, endDate: Date) => {
    // raw query might be better for aggregations, but prisma groupBy is fine for simple stuff
    const stats = await prisma.spendSnapshot.groupBy({
        by: ['campaign_id', 'date'],
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        _sum: {
            spend_micros: true,
            impressions: true,
            clicks: true,
            conversions: true,
            revenue: true
        }
    });

    // We also need Campaign Names
    const campaigns = await prisma.campaign.findMany({
        where: { id: { in: stats.map(s => s.campaign_id!).filter(Boolean) } },
        select: { id: true, title: true, client: { select: { name: true } } }
    });

    const campaignMap = new Map(campaigns.map(c => [c.id, c]));

    // Transform to friendly format
    return stats.map(s => {
        const campaign = campaignMap.get(s.campaign_id!);
        const spend = Number(s._sum.spend_micros || 0) / 1000000;
        const revenue = s._sum.revenue || 0;
        const roas = spend > 0 ? revenue / spend : 0;

        return {
            date: s.date,
            campaignId: s.campaign_id,
            campaignName: campaign?.title || 'Unknown',
            clientName: campaign?.client?.name || 'Unknown',
            spend,
            revenue,
            roas,
            impressions: s._sum.impressions || 0,
            clicks: s._sum.clicks || 0,
            conversions: s._sum.conversions || 0,
        };
    });
};
