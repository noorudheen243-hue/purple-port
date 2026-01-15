
import axios from 'axios';
import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';

const META_API_VERSION = 'v19.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Meta Service
 * Handles OAuth, Token Management, and Graph API calls.
 */

// --- OAuth & Tokens ---

export const getAuthUrl = (formattedRedirectUri: string, clientId: string, state: string) => {
    // Scopes: specific to ads management and reading
    const scopes = [
        'ads_management',
        'ads_read',
        'read_insights',
        'business_management' // Optional, for client linking
    ];

    return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?client_id=${clientId}&redirect_uri=${formattedRedirectUri}&state=${state}&scope=${scopes.join(',')}`;
};

export const exchangeCodeForToken = async (code: string, redirectUri: string) => {
    try {
        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;

        const response = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
            params: {
                client_id: appId,
                redirect_uri: redirectUri,
                client_secret: appSecret,
                code: code
            }
        });

        return response.data; // { access_token, expires_in, ... }
    } catch (error: any) {
        console.error("Meta Token Exchange Error:", error.response?.data || error.message);
        throw new Error("Failed to exchange code for token");
    }
};

export const storeUserToken = async (userId: string, tokenData: any) => {
    // Check if exists
    const existing = await prisma.metaToken.findUnique({ where: { user_id: userId } });

    // Calculate expiry
    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

    if (existing) {
        return await prisma.metaToken.update({
            where: { user_id: userId },
            data: {
                access_token: tokenData.access_token,
                expires_at: expiresAt,
                updatedAt: new Date()
            }
        });
    } else {
        return await prisma.metaToken.create({
            data: {
                user_id: userId,
                access_token: tokenData.access_token,
                expires_at: expiresAt
            }
        });
    }
};

// --- DATA FETCHING ---

export const fetchAdAccounts = async (accessToken: string) => {
    // Fetch attached ad accounts
    // query: me/adaccounts?fields=name,account_id,currency,account_status
    try {
        const response = await axios.get(`${META_GRAPH_URL}/me/adaccounts`, {
            params: {
                access_token: accessToken,
                fields: 'name,account_id,currency,account_status,business_name'
            }
        });
        return response.data.data;
    } catch (error: any) {
        console.error("Fetch Ad Accounts Error:", error.response?.data || error.message);
        throw error;
    }
};

export const fetchCampaigns = async (accountId: string, accessToken: string) => {
    // act_<ID>/campaigns
    try {
        const response = await axios.get(`${META_GRAPH_URL}/${accountId}/campaigns`, {
            params: {
                access_token: accessToken,
                fields: 'id,name,status,objective,buying_type,start_time,stop_time,daily_budget,lifetime_budget,spend_cap',
                limit: 50
            }
        });
        return response.data.data;
    } catch (error: any) {
        console.error(`Fetch Campaigns Error (${accountId}):`, error.response?.data || error.message);
        throw error;
    }
};

export const fetchAdSets = async (campaignId: string, accessToken: string) => {
    try {
        const response = await axios.get(`${META_GRAPH_URL}/${campaignId}/adsets`, {
            params: {
                access_token: accessToken,
                fields: 'id,name,status,start_time,end_time,daily_budget,lifetime_budget,bid_amount,billing_event,targeting',
                limit: 50
            }
        });
        return response.data.data;
    } catch (error: any) {
        console.error(`Fetch AdSets Error (${campaignId}):`, error.response?.data || error.message);
        return [];
    }
};

export const fetchAds = async (adSetId: string, accessToken: string) => {
    try {
        const response = await axios.get(`${META_GRAPH_URL}/${adSetId}/ads`, {
            params: {
                access_token: accessToken,
                fields: 'id,name,status,creative{id,thumbnail_url,body,title,call_to_action_type}',
                limit: 50
            }
        });
        return response.data.data;
    } catch (error: any) {
        console.error(`Fetch Ads Error (${adSetId}):`, error.response?.data || error.message);
        return [];
    }
};

export const fetchInsights = async (objectId: string, accessToken: string, level: 'campaign' | 'adset' | 'ad', datePreset = 'today') => {
    try {
        const response = await axios.get(`${META_GRAPH_URL}/${objectId}/insights`, {
            params: {
                access_token: accessToken,
                level: level,
                date_preset: datePreset,
                fields: 'spend,impressions,clicks,cpc,cpm,ctr,conversions,cost_per_conversion,reach,frequency,actions'
            }
        });
        return response.data.data;
    } catch (error: any) {
        // console.error(`Fetch Insights Error (${objectId}):`, error.response?.data || error.message);
        // Silent fail often better for insights as they might be empty
        return [];
    }
};

// --- SYNC LOGIC ---

export const syncCampaignsForAccount = async (adAccountId: string, metaAccountId: string, accessToken: string) => {
    console.log(`[Sync] Starting sync for Account ${metaAccountId}`);

    // 1. Get Campaigns
    const campaigns = await fetchCampaigns(metaAccountId, accessToken);
    let count = 0;

    for (const camp of campaigns) {
        // Upsert Campaign
        const dbCamp = await prisma.adCampaign.upsert({
            where: { external_id: camp.id },
            update: {
                name: camp.name,
                status: camp.status,
                objective: camp.objective,
                buying_type: camp.buying_type,
                start_time: camp.start_time ? new Date(camp.start_time) : null,
                end_time: camp.stop_time ? new Date(camp.stop_time) : null,
                daily_budget: camp.daily_budget ? parseFloat(camp.daily_budget) / 100 : null, // Meta cents
                lifetime_budget: camp.lifetime_budget ? parseFloat(camp.lifetime_budget) / 100 : null,
                spend_cap: camp.spend_cap ? parseFloat(camp.spend_cap) / 100 : null,
                updatedAt: new Date()
            },
            create: {
                external_id: camp.id,
                name: camp.name,
                status: camp.status,
                objective: camp.objective,
                buying_type: camp.buying_type,
                start_time: camp.start_time ? new Date(camp.start_time) : null,
                end_time: camp.stop_time ? new Date(camp.stop_time) : null,
                daily_budget: camp.daily_budget ? parseFloat(camp.daily_budget) / 100 : null,
                lifetime_budget: camp.lifetime_budget ? parseFloat(camp.lifetime_budget) / 100 : null,
                spend_cap: camp.spend_cap ? parseFloat(camp.spend_cap) / 100 : null,
                ad_account_id: adAccountId
            }
        });

        // 2. Get AdSets
        const adSets = await fetchAdSets(camp.id, accessToken);
        for (const set of adSets) {
            const dbSet = await prisma.adSet.upsert({
                where: { meta_id: set.id },
                update: {
                    name: set.name,
                    status: set.status,
                    start_time: set.start_time ? new Date(set.start_time) : null,
                    end_time: set.end_time ? new Date(set.end_time) : null,
                    daily_budget: set.daily_budget ? parseFloat(set.daily_budget) / 100 : null,
                    lifetime_budget: set.lifetime_budget ? parseFloat(set.lifetime_budget) / 100 : null,
                    bid_strategy: set.bid_strategy,
                    billing_event: set.billing_event,
                    targeting: JSON.stringify(set.targeting),
                    updatedAt: new Date()
                },
                create: {
                    meta_id: set.id,
                    name: set.name,
                    status: set.status,
                    start_time: set.start_time ? new Date(set.start_time) : null,
                    end_time: set.end_time ? new Date(set.end_time) : null,
                    daily_budget: set.daily_budget ? parseFloat(set.daily_budget) / 100 : null,
                    lifetime_budget: set.lifetime_budget ? parseFloat(set.lifetime_budget) / 100 : null,
                    bid_strategy: set.bid_strategy,
                    billing_event: set.billing_event,
                    targeting: JSON.stringify(set.targeting),
                    campaign_id: dbCamp.id
                }
            });

            // 3. Get Ads
            const ads = await fetchAds(set.id, accessToken);
            for (const ad of ads) {
                const creative = ad.creative || {};
                await prisma.adCreative.upsert({
                    where: { meta_id: ad.id },
                    update: {
                        name: ad.name,
                        status: ad.status,
                        thumbnail_url: creative.thumbnail_url,
                        body_text: creative.body,
                        headline: creative.title,
                        call_to_action: creative.call_to_action_type,
                        updatedAt: new Date()
                    },
                    create: {
                        meta_id: ad.id,
                        name: ad.name,
                        status: ad.status,
                        thumbnail_url: creative.thumbnail_url,
                        body_text: creative.body,
                        headline: creative.title,
                        call_to_action: creative.call_to_action_type,
                        creative_id: creative.id,
                        ad_set_id: dbSet.id
                    }
                });
            }
        }
        count++;
    }

    console.log(`[Sync] Synced ${count} campaigns.`);
    return count;
};
