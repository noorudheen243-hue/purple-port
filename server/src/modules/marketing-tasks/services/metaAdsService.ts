import prisma from '../../../utils/prisma';
import axios from 'axios';
import { format } from 'date-fns';
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

export class MetaAdsService {

    /**
     * Helper to fetch the valid access token for a given marketing account.
     */
    private async getValidToken(accountId: string, clientId?: string): Promise<string> {
        const idWithoutPrefix = accountId.trim().replace('act_', '');
        const idWithPrefix = `act_${idWithoutPrefix}`;

        // Build search criteria
        const where: any = {
            platform: 'meta',
            externalAccountId: { in: [idWithoutPrefix, idWithPrefix, accountId] }
        };

        // If we have a clientId, we use it to find the SPECIFIC linking for this client
        // This is crucial for multi-client accounts or ensuring we use the right token
        if (clientId) {
            where.clientId = clientId;
        }

        const account = await prisma.marketingAccount.findFirst({
            where,
            include: { metaToken: true }
        });

        if (!account) {
            // FALLBACK: If we couldn't find a record for this SPECIFIC client+account,
            // try to find ANY client that uses this account ID to get a valid token.
            // This handles cases where a shared ad account is used.
            const fallbackAccount = await prisma.marketingAccount.findFirst({
                where: { 
                    externalAccountId: { in: [idWithoutPrefix, idWithPrefix, accountId] }, 
                    platform: 'meta',
                    OR: [
                        { metaTokenId: { not: null } },
                        { accessToken: { not: null } }
                    ]
                },
                include: { metaToken: true }
            });
            
            if (fallbackAccount?.metaToken?.access_token) return fallbackAccount.metaToken.access_token;
            if (fallbackAccount?.accessToken) return fallbackAccount.accessToken;
            
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
     * Internal helper to fetch all pages from a Meta Graph API endpoint.
     */
    private async fetchAll(url: string, params: any): Promise<any[]> {
        let results: any[] = [];
        let currentUrl: string | null = url;
        let currentParams: any = { ...params, limit: 100 };

        try {
            while (currentUrl) {
                const response: any = await axios.get(currentUrl, { params: currentParams });
                const data = response.data?.data || [];
                results = [...results, ...data];
                
                currentUrl = response.data?.paging?.next || null;
                // Meta's nextUrl is a full URL with params already encoded
                currentParams = {}; 
            }
            return results;
        } catch (error: any) {
             console.error(`[MetaAds] fetchAll error for ${url}:`, error.response?.data || error.message);
             if (results.length > 0) return results;
             throw error;
        }
    }

    /**
     * Fetch all Business Manager accounts/Ad Accounts the user has access to.
     */
    async fetchAccounts(systemUserId: string, clientId?: string, profileId?: string): Promise<any[]> {
        let userToken = 'mock-long-lived-meta-token';

        if (profileId) {
            const tokenRecord = await prisma.metaToken.findUnique({ where: { id: profileId } });
            if (tokenRecord?.access_token) {
                userToken = tokenRecord.access_token;
            }
        } else if (clientId) {
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
            console.log(`[MetaAds] Discovering accounts for profile: ${profileId || 'N/A'}, clientId: ${clientId || 'N/A'}`);
            const response = await axios.get(`${META_GRAPH_URL}/me/adaccounts`, {
                params: {
                    access_token: userToken,
                    fields: 'name,account_status,currency,timezone_name'
                }
            });
            const accounts = response.data.data || [];
            console.log(`[MetaAds] Successfully discovered ${accounts.length} ad accounts.`);
            return accounts;
        } catch (error: any) {
            console.error('[MetaAds] fetchAccounts error:', error.response?.data || error.message);
            throw new Error('Failed to fetch Meta Ad Accounts from Facebook API');
        }
    }

    private ensureActPrefix(id: string): string {
        if (!id) return id;
        return id.startsWith('act_') ? id : `act_${id}`;
    }

    private mapMetaInsights(rawData: any[]): any[] {
        return rawData.map((day: any) => {
            let totalResults = 0;
            let totalConversions = 0;

            let maxMessages = 0;
            let maxLeads = 0;
            let maxPurchases = 0;
            let maxLinkClicks = 0;
            let maxEngagements = 0;

            let primaryResultType = '';

            // Meta usually declares the Primary Action explicitly in cost_per_result
            if (day.cost_per_result && Array.isArray(day.cost_per_result) && day.cost_per_result.length > 0) {
                primaryResultType = day.cost_per_result[0].action_type;
            }

            let resultsCost = parseFloat(day.cost_per_result?.[0]?.value || '0');

            if (day.actions && Array.isArray(day.actions)) {
                // If we know the primary result type, fetch it accurately
                if (primaryResultType) {
                    const primaryAction = day.actions.find((a: any) => 
                        a.action_type === primaryResultType ||
                        a.action_type === `onsite_conversion.${primaryResultType}` ||
                        (primaryResultType.includes('messaging_conversation_started') && a.action_type.includes('messaging_conversation_started'))
                    );
                    if (primaryAction) {
                        totalResults = parseInt(primaryAction.value || '0', 10);
                    }
                }

                for (const action of day.actions) {
                    const val = parseInt(action.value || '0', 10);
                    const type = action.action_type;

                    if (type.includes('lead')) maxLeads = Math.max(maxLeads, val);
                    if (type.includes('messaging_conversation_started') || type.includes('onsite_conversion.messaging_conversation_started_7d')) {
                        maxMessages = Math.max(maxMessages, val);
                    }
                    if (type.includes('purchase')) maxPurchases = Math.max(maxPurchases, val);
                    if (type === 'link_click') maxLinkClicks = Math.max(maxLinkClicks, val);
                    if (type.includes('engagement') || type === 'post_engagement') maxEngagements = Math.max(maxEngagements, val);
                }

                // If Meta didn't give us a primary result, we use our own heuristic priority
                if (!primaryResultType && totalResults === 0) {
                    totalResults = maxPurchases || maxLeads || maxMessages || maxLinkClicks || maxEngagements || 0;
                    
                    if (maxPurchases) primaryResultType = 'purchase';
                    else if (maxLeads) primaryResultType = 'lead';
                    else if (maxMessages) primaryResultType = 'messaging_conversation_started';
                    else if (maxLinkClicks) primaryResultType = 'link_click';
                    else if (maxEngagements) primaryResultType = 'engagement';
                }

                totalConversions = maxLeads + maxMessages + maxPurchases;
            }
            
            let parsedType = 'Results';
            if (primaryResultType.includes('purchase')) parsedType = 'Purchases';
            else if (primaryResultType.includes('lead')) parsedType = 'Leads';
            else if (primaryResultType.includes('message') || primaryResultType.includes('messaging')) parsedType = 'Messaging Conversations';
            else if (primaryResultType.includes('link_click')) parsedType = 'Link Clicks';
            else if (primaryResultType.includes('engagement')) parsedType = 'Engagements';
            else if (primaryResultType.includes('thruplay')) parsedType = 'ThruPlays';
            else if (primaryResultType.includes('video_view')) parsedType = 'Video Views';
            else if (primaryResultType) parsedType = primaryResultType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            let purchaseCost = 0;
            if (day.cost_per_action_type && Array.isArray(day.cost_per_action_type)) {
                const purchaseAction = day.cost_per_action_type.find((a: any) => a.action_type.includes('purchase'));
                if (purchaseAction) purchaseCost = parseFloat(purchaseAction.value || '0');
            }

            if (totalResults > 0 && resultsCost === 0) {
                resultsCost = (parseFloat(day.spend || '0')) / totalResults;
            }

            return {
                ...day,
                results: totalResults,
                results_type: parsedType,
                results_cost: resultsCost,
                conversions: totalConversions,
                conversations: maxMessages,
                messaging_conversations: maxMessages,
                new_messaging_contacts: maxMessages,
                purchases: maxPurchases,
                cost_per_purchase: purchaseCost
            };
        });
    }

    /**
     * Fetch all campaigns under a specific Ad Account.
     */
    async fetchCampaigns(accountId: string, clientId?: string): Promise<any[]> {
        const token = await this.getValidToken(accountId, clientId);
        const formattedAccountId = this.ensureActPrefix(accountId);
        console.log(`[MetaAds] fetchCampaigns called for account: ${formattedAccountId}`);

        if (token.startsWith('mock')) {
            return [
                { id: 'camp_meta_1', name: 'IG Awareness Q1', status: 'ACTIVE', effective_status: 'ACTIVE', objective: 'BRAND_AWARENESS', start_time: '2024-01-01T10:00:00+0000' },
                { id: 'camp_meta_2', name: 'FB Lead Gen - Real Estate', status: 'ACTIVE', effective_status: 'ACTIVE', objective: 'LEAD_GENERATION', start_time: '2024-02-15T08:00:00+0000' }
            ];
        }

        try {
            const campaigns = await this.fetchAll(`${META_GRAPH_URL}/${formattedAccountId}/campaigns`, {
                access_token: token,
                fields: 'id,name,status,effective_status,objective,bid_strategy,daily_budget,lifetime_budget,start_time,stop_time,pacing_type',
                effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'PENDING_REVIEW', 'DISAPPROVED', 'PREAPPROVED', 'PENDING_BILLING_INFO', 'CAMPAIGN_PAUSED', 'ARCHIVED', 'ADSET_PAUSED', 'IN_PROCESS', 'WITH_ISSUES'])
            });
            console.log(`[MetaAds] fetchCampaigns result for ${formattedAccountId}: ${campaigns.length} campaigns.`);
            return campaigns;
        } catch (error: any) {
            console.error(`[MetaAds] fetchCampaigns error for ${formattedAccountId}:`, error.response?.data || error.message);
            throw error;
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
                    cost_per_result: (Math.random() * 50).toFixed(2),
                    actions: [
                        { action_type: 'lead', value: Math.floor(Math.random() * 10) },
                        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: Math.floor(Math.random() * 5) },
                        { action_type: 'purchase', value: Math.floor(Math.random() * 2) }
                    ],
                    cost_per_action_type: [
                        { action_type: 'purchase', value: (Math.random() * 100).toFixed(2) }
                    ]
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return mockData;
        }

        try {
            const rawData = await this.fetchAll(`${META_GRAPH_URL}/${campaignId}/insights`, {
                access_token: token,
                time_range: timeRange,
                time_increment: 1, // Daily breakdown
                fields: 'impressions,reach,clicks,spend,actions,cpc,cpm,ctr,cost_per_result,cost_per_action_type',
                use_unified_attribution_setting: true
            });

            return this.mapMetaInsights(rawData);
        } catch (error: any) {
            console.error(`Meta API fetchMetrics error for campaign ${campaignId}:`, error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Fetch true EXACT lifetime metrics from the campaign creation to today without daily chunking precision loss
     */
    async fetchLifetimeMetrics(campaignId: string, accountId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
        const token = await this.getValidToken(accountId);
        if (token.startsWith('mock')) {
             return this.mapMetaInsights([
                {
                    spend: '180.91',
                    impressions: 1604,
                    reach: 1539,
                    actions: [{ action_type: 'link_click', value: '61' }],
                    cost_per_result: [{ action_type: 'link_click', value: '2.96' }]
                }
             ]);
        }
        
        try {
            const params: any = {
                access_token: token,
                fields: 'impressions,reach,clicks,spend,actions,cpc,cpm,ctr,cost_per_result,cost_per_action_type'
            };

            if (startDate) {
                const today = new Date();
                params.time_range = JSON.stringify({
                    since: format(startDate, 'yyyy-MM-dd'),
                    until: format(endDate || today, 'yyyy-MM-dd')
                });
            } else {
                params.date_preset = 'maximum';
            }

            const rawData = await this.fetchAll(`${META_GRAPH_URL}/${campaignId}/insights`, params);

            return this.mapMetaInsights(rawData);
        } catch (error: any) {
            console.error(`Meta API fetchLifetimeMetrics error for campaign ${campaignId}:`, error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Fetch daily insights (metrics) for an entire account broken down by campaign over a date range.
     * This avoids making N API calls for N campaigns.
     */
    async fetchAccountMetricsByCampaign(accountId: string, from: Date, to: Date, clientId?: string): Promise<any[]> {
        const token = await this.getValidToken(accountId, clientId);
        const formattedAccountId = this.ensureActPrefix(accountId);

        // Format dates as YYYY-MM-DD required by Meta Ads API
        const timeRange = JSON.stringify({
            since: format(from, 'yyyy-MM-dd'),
            until: format(to, 'yyyy-MM-dd')
        });

        if (token.startsWith('mock')) {
            // Wait, we can generate a mock list, but mostly keeping it empty or a single entry for sandbox since it's already tested
            return [];
        }

        try {
            const rawData = await this.fetchAll(`${META_GRAPH_URL}/${formattedAccountId}/insights`, {
                access_token: token,
                level: 'campaign',
                time_range: timeRange,
                time_increment: 1, // Daily breakdown
                fields: 'campaign_id,campaign_name,impressions,reach,clicks,spend,actions,cpc,cpm,ctr,cost_per_result,cost_per_action_type',
                use_unified_attribution_setting: true
            });

            return this.mapMetaInsights(rawData);
        } catch (error: any) {
            console.error(`Meta API fetchAccountMetricsByCampaign error for account ${formattedAccountId}:`, error.response?.data || error.message);
            throw error;
        }
    }


    // ==========================================
    // META ADS MANAGER EXTENSIONS
    // ==========================================

    /**
     * Fetch deep campaign details (including daily budgets, spend)
     */
    async fetchCampaignsDetailed(accountId: string): Promise<any[]> {
        const token = await this.getValidToken(accountId);
        const formattedAccountId = this.ensureActPrefix(accountId);
        
        if (token.startsWith('mock')) {
            return [
                { id: 'camp_meta_1', name: 'IG Awareness Q1', status: 'ACTIVE', objective: 'OUTCOME_AWARENESS', daily_budget: 100000, start_time: new Date().toISOString() },
                { id: 'camp_meta_2', name: 'FB Lead Gen - Real Estate', status: 'PAUSED', objective: 'OUTCOME_LEADS', daily_budget: 500000, start_time: new Date().toISOString() }
            ];
        }

        try {
            return await this.fetchAll(`${META_GRAPH_URL}/${formattedAccountId}/campaigns`, {
                access_token: token,
                fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time',
                effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'])
            });
        } catch (error: any) {
            console.error(`fetchCampaignsDetailed error:`, error.response?.data || error.message);
            throw new Error(`Failed to fetch campaigns: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    /**
     * Fetch Ad Sets for a campaign
     */
    async fetchAdSets(campaignId: string, accountId: string): Promise<any[]> {
        const token = await this.getValidToken(accountId);
        if (token.startsWith('mock')) return [{ id: 'adset_1', name: 'Broad Audience 18-65', status: 'ACTIVE', daily_budget: 50000, targeting: {} }];

        try {
            const response = await axios.get(`${META_GRAPH_URL}/${campaignId}/adsets`, {
                params: {
                    access_token: token,
                    fields: 'id,name,status,daily_budget,lifetime_budget,start_time,end_time,targeting,promoted_object,billing_event,optimization_goal'
                }
            });
            return response.data?.data || [];
        } catch (error: any) {
            console.error(`fetchAdSets error:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Fetch Ads for an Ad Set
     */
    async fetchAds(adSetId: string, accountId: string): Promise<any[]> {
        const token = await this.getValidToken(accountId);
        if (token.startsWith('mock')) return [{ id: 'ad_1', name: 'Static Image Ad - House 1', status: 'ACTIVE', creative: { id: 'creative_1' } }];

        try {
            const response = await axios.get(`${META_GRAPH_URL}/${adSetId}/ads`, {
                params: {
                    access_token: token,
                    fields: 'id,name,status,creative{id,name,thumbnail_url}'
                }
            });
            return response.data?.data || [];
        } catch (error: any) {
            console.error(`fetchAds error:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Create a new Campaign
     */
    async createCampaign(accountId: string, data: { name: string, objective: string, status?: string }): Promise<any> {
        const token = await this.getValidToken(accountId);
        const formattedAccountId = this.ensureActPrefix(accountId);
        if (token.startsWith('mock')) return { id: `camp_mock_${Date.now()}`, ...data };

        try {
            const response = await axios.post(`${META_GRAPH_URL}/${formattedAccountId}/campaigns`, {
                name: data.name,
                objective: data.objective,
                status: data.status || 'PAUSED',
                special_ad_categories: [], // Empty for regular ads
                access_token: token
            });
            return response.data;
        } catch (error: any) {
            console.error(`createCampaign error:`, error.response?.data || error.message);
            throw new Error(`Campaign Creation Failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    /**
     * Create a new Ad Set
     */
    async createAdSet(accountId: string, data: any): Promise<any> {
        const token = await this.getValidToken(accountId);
        const formattedAccountId = this.ensureActPrefix(accountId);
        if (token.startsWith('mock')) return { id: `adset_mock_${Date.now()}`, ...data };

        try {
            const payload = {
                ...data,
                access_token: token
            };
            const response = await axios.post(`${META_GRAPH_URL}/${formattedAccountId}/adsets`, payload);
            return response.data;
        } catch (error: any) {
            console.error(`createAdSet error:`, error.response?.data?.error || error.message);
            throw new Error(`Ad Set Creation Failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    /**
     * Update Object Status (Pause/Activate)
     */
    async updateStatus(objectId: string, accountId: string, status: 'ACTIVE' | 'PAUSED'): Promise<any> {
        const token = await this.getValidToken(accountId);
        if (token.startsWith('mock')) return { success: true };

        try {
            const response = await axios.post(`${META_GRAPH_URL}/${objectId}`, {
                status,
                access_token: token
            });
            return response.data;
        } catch (error: any) {
            console.error(`updateStatus error:`, error.response?.data || error.message);
            throw new Error(`Status Update Failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}

