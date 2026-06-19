import prisma from '../../../utils/prisma';
import axios from 'axios';
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

export class MetaLeadsService {

    /**
     * Helper to fetch the valid USER access token for a given marketing account.
     */
    private async getValidToken(accountId: string): Promise<string> {
        const account = await prisma.marketingAccount.findFirst({
            where: { externalAccountId: accountId, platform: 'meta' },
            include: { metaToken: true }
        });

        if (!account) throw new Error(`No marketing account found for ID ${accountId}`);
        if (account.metaToken?.access_token) return account.metaToken.access_token;
        if (!account.accessToken) throw new Error(`No access token found for account ${accountId}`);
        return account.accessToken;
    }

    /**
     * Get all Facebook Pages the user admins, along with their Page Access Tokens.
     * Page Access Tokens are required to call /{pageId}/leadgen_forms and /{formId}/leads.
     */
    private async getPageTokens(userToken: string): Promise<Array<{ id: string; name: string; access_token: string }>> {
        try {
            const res = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
                params: { access_token: userToken, fields: 'id,name,access_token', limit: 100 }
            });
            return res.data?.data || [];
        } catch (e: any) {
            console.error('[MetaLeads] Failed to get page tokens:', e.response?.data?.error?.message || e.message);
            return [];
        }
    }

    /**
     * Fetch all leads from a given Facebook Page using its Page Access Token.
     * Flow: /{pageId}/leadgen_forms → /{formId}/leads
     */
    private async fetchLeadsForPage(
        pageId: string,
        pageName: string,
        pageToken: string,
        campaignMap: Record<string, any>
    ): Promise<any[]> {
        const allLeads: any[] = [];

        try {
            // Get all leadgen forms for this page
            let formsAfter: string | null = null;
            let allForms: any[] = [];
            do {
                const formsParams: any = {
                    access_token: pageToken,
                    fields: 'id,name,leads_count',
                    limit: 100
                };
                if (formsAfter) formsParams.after = formsAfter;
                const formsRes = await axios.get(`${META_GRAPH_URL}/${pageId}/leadgen_forms`, { params: formsParams });
                allForms = allForms.concat(formsRes.data?.data || []);
                formsAfter = formsRes.data?.paging?.cursors?.after || null;
                if (!formsRes.data?.paging?.next) break;
            } while (formsAfter);

            console.log(`[MetaLeads] Page "${pageName}" (${pageId}): ${allForms.length} leadgen forms`);

            for (const form of allForms) {
                if (form.leads_count === 0) continue;
                try {
                    let after: string | null = null;
                    do {
                        const params: any = {
                            access_token: pageToken,
                            fields: 'id,created_time,field_data,form_id,campaign_id,ad_id',
                            limit: 100
                        };
                        if (after) params.after = after;
                        const leadsRes = await axios.get(`${META_GRAPH_URL}/${form.id}/leads`, { params });
                        const pageLeads: any[] = leadsRes.data?.data || [];
                        // Tag each lead with the form name for campaign matching
                        pageLeads.forEach(l => { l._formName = form.name; l._pageName = pageName; });
                        allLeads.push(...pageLeads);
                        after = leadsRes.data?.paging?.cursors?.after || null;
                        if (!leadsRes.data?.paging?.next) break;
                    } while (after);
                } catch (formErr: any) {
                    console.warn(`[MetaLeads] Form ${form.id} leads error: ${formErr.response?.data?.error?.message || formErr.message}`);
                }
            }
        } catch (e: any) {
            const msg = e.response?.data?.error?.message || e.message;
            console.warn(`[MetaLeads] Page ${pageId} forms error: ${msg}`);
        }

        return allLeads;
    }

    /**
     * Fetch a single lead by its leadgen_id using a Page Access Token.
     * Used by the webhook handler when Meta pushes a lead notification.
     */
    async fetchLeadById(leadgenId: string, pageToken: string): Promise<any | null> {
        try {
            const res = await axios.get(`${META_GRAPH_URL}/${leadgenId}`, {
                params: {
                    access_token: pageToken,
                    fields: 'id,created_time,field_data,form_id,campaign_id,ad_id'
                }
            });
            return res.data;
        } catch (e: any) {
            console.error('[MetaLeads] fetchLeadById error:', e.response?.data?.error?.message || e.message);
            return null;
        }
    }

    /**
     * Get a Page Access Token for a specific pageId from the stored tokens.
     * Used by the webhook handler.
     */
    async getPageTokenForPage(pageId: string): Promise<string | null> {
        // Look for any marketing account that can see this page
        const accounts = await prisma.marketingAccount.findMany({
            where: { platform: 'meta' },
            include: { metaToken: true }
        });
        for (const acct of accounts) {
            const userToken = acct.metaToken?.access_token || acct.accessToken;
            if (!userToken) continue;
            const pages = await this.getPageTokens(userToken);
            const page = pages.find(p => p.id === pageId);
            if (page?.access_token) return page.access_token;
        }
        return null;
    }

    /**
     * Save a single raw Meta lead object into the CRM.
     * campaignMap maps externalCampaignId → DB campaign row.
     */
    async saveLead(lead: any, clientId: string, campaignMap: Record<string, any>): Promise<boolean> {
        try {
            const campaign = campaignMap[lead.campaign_id] || null;
            const fields: Record<string, string> = {};
            for (const f of (lead.field_data || [])) {
                fields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
            }

            const name = fields['full_name'] || fields['name']
                || `${fields['first_name'] || ''} ${fields['last_name'] || ''}`.trim()
                || null;
            const email = fields['email'] || fields['email_address'] || null;
            const phone = fields['phone_number'] || fields['mobile_number'] || fields['phone'] || null;
            const location = fields['city'] || fields['state'] || fields['country']
                || fields['location'] || fields['area'] || null;

            await (prisma as any).lead.upsert({
                where: { externalLeadId: lead.id.toString() },
                update: {
                    name, email, phone, location,
                    campaign_name: campaign?.name || null,
                    date: lead.created_time ? new Date(lead.created_time) : new Date(),
                    group_id: campaign?.group_id || null,
                    fieldData: JSON.stringify(fields),
                    metaCreatedAt: lead.created_time ? new Date(lead.created_time) : null,
                    updatedAt: new Date()
                },
                create: {
                    client_id: clientId,
                    campaignId: campaign?.id || null,
                    campaign_name: campaign?.name || null,
                    group_id: campaign?.group_id || null,
                    source: 'AUTO',
                    externalLeadId: lead.id.toString(),
                    formId: lead.form_id ? lead.form_id.toString() : `AD_${lead.ad_id}`,
                    name, email, phone, location,
                    date: lead.created_time ? new Date(lead.created_time) : new Date(),
                    fieldData: JSON.stringify(fields),
                    metaCreatedAt: lead.created_time ? new Date(lead.created_time) : null
                }
            });
            return true;
        } catch (e: any) {
            console.warn(`[MetaLeads] Failed to save lead ${lead.id}: ${e.message}`);
            return false;
        }
    }

    /**
     * Main sync: Pull all leads for a given client/account combination.
     *
     * Strategy:
     *  1. Get the user access token for the account
     *  2. Exchange for Page Access Tokens via /me/accounts
     *  3. For each accessible page → get leadgen forms → get leads
     *  4. Upsert all leads into the CRM
     */
    async syncLeads(clientId: string, accountId: string): Promise<{ synced: number; skipped: number }> {
        let synced = 0;
        let skipped = 0;

        try {
            const userToken = await this.getValidToken(accountId);

            // Build campaign map: externalCampaignId → campaign DB row
            const campaigns = await (prisma as any).marketingCampaign.findMany({
                where: { clientId, platform: 'meta' }
            });
            const campaignMap: Record<string, any> = {};
            for (const c of campaigns) {
                if (c.externalCampaignId) campaignMap[c.externalCampaignId] = c;
            }

            console.log(`[MetaLeads] Syncing client ${clientId}, account ${accountId} (${campaigns.length} campaigns)`);

            // Get all pages this user admins (with their Page Access Tokens)
            const pages = await this.getPageTokens(userToken);
            if (pages.length === 0) {
                console.warn(`[MetaLeads] No accessible Facebook Pages found for account ${accountId}`);
                return { synced, skipped };
            }
            console.log(`[MetaLeads] Accessible pages: ${pages.map(p => p.name).join(', ')}`);

            // Fetch leads from all accessible pages
            for (const page of pages) {
                const leads = await this.fetchLeadsForPage(page.id, page.name, page.access_token, campaignMap);
                console.log(`[MetaLeads] Page "${page.name}": ${leads.length} leads to process`);

                for (const lead of leads) {
                    const saved = await this.saveLead(lead, clientId, campaignMap);
                    if (saved) synced++; else skipped++;
                }
            }

        } catch (error: any) {
            const metaError = error.response?.data?.error;
            const errorMsg = metaError
                ? `Meta API: ${metaError.message || metaError.error_user_msg || error.message}`
                : (error.message || 'Unknown sync error');
            console.error('[MetaLeads] Global syncLeads error:', errorMsg);
        }

        return { synced, skipped };
    }
}
