import prisma from '../../../utils/prisma';
import axios from 'axios';
import { format } from 'date-fns';
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

export class MetaAdsService {

    /**
     * Helper to fetch the valid access token for a given marketing account.
     */
    private async getValidToken(accountId: string): Promise<string> {
        const account = await prisma.marketingAccount.findFirst({
            where: { externalAccountId: accountId, platform: 'meta' },
            include: { metaToken: true }
        });

        if (!account) {
            throw new Error(`Meta Ads: No marketing account found for ID ${accountId}`);
        }

        // Prioritize the token from the linked MetaToken record (Global Profile)
        if (account.metaToken?.access_token) {
            return account.metaToken.access_token;
        }

        if (!account.accessToken) {
            throw new Error(`Meta Ads: No access token found for account ${accountId}`);
        }

        return account.accessToken;
    }

    /**
     * Fetch all Business Manager accounts/Ad Accounts the user has access to.
     */
    async fetchAccounts(systemUserId: string, clientId?: string): Promise<any[]> {
        let userToken = 'mock-long-lived-meta-token';

        if (clientId) {
            const acc = await prisma.marketingAccount.findFirst({
                where: { clientId, platform: 'meta' },
                include: { metaToken: true }
            });
            if (acc?.metaToken?.access_token) {
                userToken = acc.metaToken.access_token;
            } else if (acc?.accessToken) {
                userToken = acc.accessToken;
            }
        }

        if (userToken === 'mock-long-lived-meta-token') {
            const user = await prisma.user.findUnique({
                where: { id: systemUserId },
                include: { metaTokens: { where: { isActive: true }, take: 1 } }
            });
            userToken = user?.metaTokens?.[0]?.access_token || userToken;
        }

        // Local Sandbox Mock
        if (userToken.startsWith('mock')) {
            return [{ id: 'act_123456789', name: 'Antigravity Test Ad Account', account_status: 1 }];
        }

        try {
            const response = await axios.get(`${META_GRAPH_URL}/me/adaccounts`, {
                params: {
                    access_token: userToken,
                    fields: 'name,account_status,currency,timezone_name'
                }
            });
            return response.data.data;
        } catch (error: any) {
            console.error('Meta API fetchAccounts error:', error.response?.data || error.message);
            throw new Error('Failed to fetch Meta Ad Accounts');
        }
    }

    private ensureActPrefix(id: string): string {
        if (!id) return id;
        return id.startsWith('act_') ? id : `act_${id}`;
    }

    /**
     * Fetch all campaigns under a specific Ad Account.
     */
    async fetchCampaigns(accountId: string): Promise<any[]> {
        const token = await this.getValidToken(accountId);
        const formattedAccountId = this.ensureActPrefix(accountId);
        console.log(`[MetaAds] fetchCampaigns called for account: ${formattedAccountId}`);

        if (token.startsWith('mock')) {
            return [
                { id: 'camp_meta_1', name: 'IG Awareness Q1', status: 'ACTIVE', objective: 'BRAND_AWARENESS' },
                { id: 'camp_meta_2', name: 'FB Lead Gen - Real Estate', status: 'ACTIVE', objective: 'LEAD_GENERATION' }
            ];
        }

        try {
            const response = await axios.get(`${META_GRAPH_URL}/${formattedAccountId}/campaigns`, {
                params: {
                    access_token: token,
                    fields: 'id,name,status,objective',
                    // Use proper JSON array — single-quoted string was invalid and caused empty results
                    effective_status: JSON.stringify(['ACTIVE', 'PAUSED'])
                }
            });
            const campaigns = response.data?.data || [];
            console.log(`[MetaAds] fetchCampaigns result for ${formattedAccountId}: ${campaigns.length} campaigns.`, campaigns.map((c: any) => `${c.name}(${c.status})`));
            return campaigns;
        } catch (error: any) {
            console.error(`[MetaAds] fetchCampaigns error for ${formattedAccountId}:`, error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Fetch daily insights (metrics) for a specific campaign over a date range.
     */
    async fetchMetrics(campaignId: string, accountId: string, from: Date, to: Date): Promise<any[]> {
        const token = await this.getValidToken(accountId);
        const formattedAccountId = this.ensureActPrefix(accountId);

        // Format dates as YYYY-MM-DD required by Meta Ads API
        const timeRange = JSON.stringify({
            since: format(from, 'yyyy-MM-dd'),
            until: format(to, 'yyyy-MM-dd')
        });

        if (token.startsWith('mock')) {
            // Generate some random seeded data based on the requested days
            const mockData = [];
            let currentDate = new Date(from);
            while (currentDate <= to) {
                mockData.push({
                    date_start: format(currentDate, 'yyyy-MM-dd'),
                    impressions: Math.floor(Math.random() * 5000),
                    reach: Math.floor(Math.random() * 4000), // Mock reach
                    clicks: Math.floor(Math.random() * 200),
                    spend: (Math.random() * 1000).toFixed(2),
                    results: Math.floor(Math.random() * 20), // Mock results
                    actions: [{ action_type: 'lead', value: Math.floor(Math.random() * 10) }]
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return mockData;
        }

        try {
            const response = await axios.get(`${META_GRAPH_URL}/${campaignId}/insights`, {
                params: {
                    access_token: token,
                    time_range: timeRange,
                    time_increment: 1, // Daily breakdown
                    fields: 'impressions,reach,clicks,spend,actions,cpc,cpm,ctr'
                }
            });

            // Map actions array to flat results/conversions
            const data = response.data.data || [];
            return data.map((day: any) => {
                let totalResults = 0;
                let totalConversions = 0;

                let maxMessages = 0;
                let maxLeads = 0;
                let maxPurchases = 0;

                if (day.actions && Array.isArray(day.actions)) {
                    // Find the most relevant resulting action for this campaign.
                    // Meta often returns both generic ("lead") and specific ("onsite_conversion.lead_grouped").
                    // To prevent double counting, we will take the max value of these primary conversion types.
                    for (const action of day.actions) {
                        const val = parseInt(action.value || '0', 10);
                        const type = action.action_type;

                        if (type.includes('lead')) maxLeads = Math.max(maxLeads, val);
                        if (type.includes('messaging_conversation_started')) maxMessages = Math.max(maxMessages, val);
                        if (type.includes('purchase')) maxPurchases = Math.max(maxPurchases, val);
                    }

                    // The total results is the sum of unique maxed primary events
                    totalResults = maxLeads + maxMessages + maxPurchases;
                    totalConversions = totalResults;
                }

                return {
                    ...day,
                    results: totalResults,
                    conversions: totalConversions,
                    conversations: maxMessages
                };
            });
        } catch (error: any) {
            console.error(`Meta API fetchMetrics error for campaign ${campaignId}:`, error.response?.data || error.message);
            return [];
        }
    }
}
