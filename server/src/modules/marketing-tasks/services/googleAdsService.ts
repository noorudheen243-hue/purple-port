import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { format } from 'date-fns';

const prisma = new PrismaClient();
const GOOGLE_ADS_API_URL = 'https://googleads.googleapis.com/v16/customers';

export class GoogleAdsService {

    /**
     * Helper to fetch the valid access token
     */
    private async getValidToken(accountId: string): Promise<string> {
        const account = await prisma.marketingAccount.findFirst({
            where: { externalAccountId: accountId, platform: 'google' }
        });
        if (!account || !account.accessToken) {
            throw new Error(`Google Ads: No access token found for account ${accountId}`);
        }

        // In real implementation, check if tokenExpiry < now() and use refreshToken to get a new one.
        return account.accessToken;
    }

    /**
     * Fetch Google Ads Customer Accounts accessible to the token
     */
    async fetchAccounts(systemUserId: string): Promise<any[]> {
        // Fetch OAuth token (In reality, joined via user's linked google identity)
        const account = await prisma.marketingAccount.findFirst({
            where: { platform: 'google', client: { account_manager_id: systemUserId } }
        });

        const token = account?.accessToken || 'mock-gads-token';

        if (token.startsWith('mock')) {
            return [{ id: '987654321', descriptiveName: 'Antigravity Demo Google Ads' }];
        }

        try {
            const response = await axios.get(`https://googleads.googleapis.com/v16/customers:listAccessibleCustomers`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || ''
                }
            });
            return response.data.resourceNames;
        } catch (error: any) {
            console.error('Google Ads API fetchAccounts error:', error.response?.data || error.message);
            throw new Error('Failed to fetch Google Ad Accounts');
        }
    }

    /**
     * Fetch active campaigns
     */
    async fetchCampaigns(customerId: string): Promise<any[]> {
        const token = await this.getValidToken(customerId);

        if (token.startsWith('mock')) {
            return [
                { id: 'camp_gads_1', name: 'Search - IT Services - Exact', status: 'ENABLED', start_date: '2024-01-10' },
                { id: 'camp_gads_2', name: 'PMax - Corporate Video Prod', status: 'ENABLED', start_date: '2024-03-05' }
            ];
        }

        try {
            const query = `
                SELECT campaign.id, campaign.name, campaign.status, campaign.start_date
                FROM campaign
                WHERE campaign.status IN ('ENABLED', 'PAUSED')
            `;
            const response = await axios.post(`${GOOGLE_ADS_API_URL}/${customerId}/googleAds:search`, {
                query
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || ''
                }
            });
            return response.data.results?.map((r: any) => r.campaign) || [];
        } catch (error: any) {
            console.error('Google Ads API fetchCampaigns error:', error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Fetch metrics daily
     */
    async fetchMetrics(campaignId: string, accountId: string, from: Date, to: Date): Promise<any[]> {
        const token = await this.getValidToken(accountId);

        if (token.startsWith('mock')) {
            const mockData = [];
            let currentDate = new Date(from);
            while (currentDate <= to) {
                mockData.push({
                    segments: { date: format(currentDate, 'yyyy-MM-dd') },
                    metrics: {
                        impressions: Math.floor(Math.random() * 2000),
                        reach: Math.floor(Math.random() * 1600), // Mock reach
                        clicks: Math.floor(Math.random() * 150),
                        costMicros: Math.floor(Math.random() * 500000000), // cost in micros
                        conversions: Math.floor(Math.random() * 5)
                    }
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return mockData;
        }

        try {
            const fromStr = format(from, 'yyyy-MM-dd');
            const toStr = format(to, 'yyyy-MM-dd');

            const query = `
                SELECT 
                    segments.date,
                    metrics.impressions, 
                    metrics.clicks, 
                    metrics.cost_micros, 
                    metrics.conversions 
                FROM campaign 
                WHERE campaign.id = ${campaignId} 
                AND segments.date BETWEEN '${fromStr}' AND '${toStr}'
            `;

            const response = await axios.post(`${GOOGLE_ADS_API_URL}/${accountId}/googleAds:search`, {
                query
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || ''
                }
            });
            return response.data.results || [];
        } catch (error: any) {
            console.error(`Google API fetchMetrics error ${campaignId}:`, error.response?.data || error.message);
            return [];
        }
    }
}
