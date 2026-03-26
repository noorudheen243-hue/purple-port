import prisma from '../../../utils/prisma';
import axios from 'axios';
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

export class MetaLeadsService {

    /**
     * Helper to fetch the valid access token for a given marketing account.
     */
    private async getValidToken(accountId: string): Promise<string> {
        const account = await prisma.marketingAccount.findFirst({
            where: { externalAccountId: accountId, platform: 'meta' },
            include: { metaToken: true }
        });

        if (!account) {
            throw new Error(`Meta Leads System: No marketing account found for ID ${accountId}`);
        }

        if (account.metaToken?.access_token) {
            return account.metaToken.access_token;
        }

        if (!account.accessToken) {
            throw new Error(`Meta Leads System: No access token found for account ${accountId}`);
        }

        return account.accessToken;
    }

    /**
     * Fetch all all leads for a given ad account + client combination.
     * Iterates through all campaigns -> lead forms -> individual lead submissions.
     */
    async syncLeads(clientId: string, accountId: string): Promise<{ synced: number; skipped: number }> {
        let synced = 0;
        let skipped = 0;

        try {
            const accessToken = await this.getValidToken(accountId);
            // Find all meta campaigns that belong to this client
            const campaigns = await (prisma as any).marketingCampaign.findMany({
                where: { clientId, platform: 'meta' }
            });

            if (campaigns.length === 0) {
                console.log(`[MetaLeads] No campaigns found in DB for client ${clientId}`);
                return { synced, skipped };
            }

            console.log(`[MetaLeads] Will sync leads for ${campaigns.length} campaigns`);

            const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

            // Get all ads for this account to map them to their campaigns
            const adsRes = await axios.get(`${META_GRAPH_URL}/${formattedAccountId}/ads`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,campaign_id,name',
                    limit: 200
                }
            });
            const ads: any[] = adsRes.data?.data || [];

            // Group ad IDs by their campaign ID
            const adIdsByCampaign: Record<string, string[]> = {};
            for (const ad of ads) {
                if (ad.campaign_id) {
                    if (!adIdsByCampaign[ad.campaign_id]) adIdsByCampaign[ad.campaign_id] = [];
                    adIdsByCampaign[ad.campaign_id].push(ad.id);
                }
            }

            for (const campaign of campaigns) {
                const extCampId = campaign.externalCampaignId;
                if (!extCampId || !adIdsByCampaign[extCampId]) continue;

                const adIds = adIdsByCampaign[extCampId];
                console.log(`[MetaLeads] Campaign ${campaign.name} has ${adIds.length} ads. Syncing leads...`);

                for (const adId of adIds) {
                    let after: string | null = null;
                    do {
                        const params: any = {
                            access_token: accessToken,
                            fields: 'id,created_time,field_data',
                            limit: 100
                        };
                        if (after) params.after = after;

                        const leadsRes = await axios.get(`${META_GRAPH_URL}/${adId}/leads`, { params });
                        const leads: any[] = leadsRes.data?.data || [];
                        after = leadsRes.data?.paging?.cursors?.after || null;
                        const hasNextPage = leadsRes.data?.paging?.next ? true : false;

                        console.log(`[MetaLeads] Ad ${adId}: fetched ${leads.length} leads (page)`);

                        for (const lead of leads) {
                            try {
                                const fields: Record<string, string> = {};
                                for (const f of (lead.field_data || [])) {
                                    fields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
                                }

                                const name = fields['full_name'] || fields['name'] || `${fields['first_name'] || ''} ${fields['last_name'] || ''}`.trim() || null;
                                const email = fields['email'] || fields['email_address'] || null;
                                const phone = fields['phone_number'] || fields['mobile_number'] || fields['phone'] || null;

                                await (prisma as any).lead.upsert({
                                    where: { externalLeadId: lead.id.toString() },
                                    update: {
                                        name,
                                        email,
                                        phone,
                                        date: lead.created_time ? new Date(lead.created_time) : new Date(),
                                        updatedAt: new Date()
                                    },
                                    create: {
                                        clientId,
                                        campaignId: campaign.id,
                                        source: 'AUTO',
                                        externalLeadId: lead.id.toString(),
                                        formId: `AD_${adId}`,
                                        name,
                                        email,
                                        phone,
                                        date: lead.created_time ? new Date(lead.created_time) : new Date(),
                                        fieldData: JSON.stringify(fields),
                                        metaCreatedAt: lead.created_time ? new Date(lead.created_time) : null
                                    }
                                });
                                synced++;
                            } catch (e: any) {
                                console.warn(`[MetaLeads] Skipping lead ${lead.id}: ${e.message}`);
                                skipped++;
                            }
                        }

                        if (!hasNextPage) break;
                    } while (after);
                }
            }
        } catch (error: any) {
            console.error('[MetaLeads] syncLeads error:', error.response?.data || error.message);
            throw error;
        }

        return { synced, skipped };
    }
}
