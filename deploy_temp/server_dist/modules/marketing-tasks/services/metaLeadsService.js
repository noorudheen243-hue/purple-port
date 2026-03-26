"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaLeadsService = void 0;
const prisma_1 = __importDefault(require("../../../utils/prisma"));
const axios_1 = __importDefault(require("axios"));
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';
class MetaLeadsService {
    /**
     * Helper to fetch the valid access token for a given marketing account.
     */
    getValidToken(accountId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const account = yield prisma_1.default.marketingAccount.findFirst({
                where: { externalAccountId: accountId, platform: 'meta' },
                include: { metaToken: true }
            });
            if (!account) {
                throw new Error(`Meta Leads System: No marketing account found for ID ${accountId}`);
            }
            if ((_a = account.metaToken) === null || _a === void 0 ? void 0 : _a.access_token) {
                return account.metaToken.access_token;
            }
            if (!account.accessToken) {
                throw new Error(`Meta Leads System: No access token found for account ${accountId}`);
            }
            return account.accessToken;
        });
    }
    /**
     * Fetch all all leads for a given ad account + client combination.
     * Iterates through all campaigns -> lead forms -> individual lead submissions.
     */
    syncLeads(clientId, accountId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            let synced = 0;
            let skipped = 0;
            try {
                const accessToken = yield this.getValidToken(accountId);
                // Find all meta campaigns that belong to this client
                const campaigns = yield prisma_1.default.marketingCampaign.findMany({
                    where: { clientId, platform: 'meta' }
                });
                if (campaigns.length === 0) {
                    console.log(`[MetaLeads] No campaigns found in DB for client ${clientId}`);
                    return { synced, skipped };
                }
                console.log(`[MetaLeads] Will sync leads for ${campaigns.length} campaigns`);
                const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
                // Get all ads for this account to map them to their campaigns
                const adsRes = yield axios_1.default.get(`${META_GRAPH_URL}/${formattedAccountId}/ads`, {
                    params: {
                        access_token: accessToken,
                        fields: 'id,campaign_id,name',
                        limit: 200
                    }
                });
                const ads = ((_a = adsRes.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                // Group ad IDs by their campaign ID
                const adIdsByCampaign = {};
                for (const ad of ads) {
                    if (ad.campaign_id) {
                        if (!adIdsByCampaign[ad.campaign_id])
                            adIdsByCampaign[ad.campaign_id] = [];
                        adIdsByCampaign[ad.campaign_id].push(ad.id);
                    }
                }
                for (const campaign of campaigns) {
                    const extCampId = campaign.externalCampaignId;
                    if (!extCampId || !adIdsByCampaign[extCampId])
                        continue;
                    const adIds = adIdsByCampaign[extCampId];
                    console.log(`[MetaLeads] Campaign ${campaign.name} has ${adIds.length} ads. Syncing leads...`);
                    for (const adId of adIds) {
                        let after = null;
                        do {
                            const params = {
                                access_token: accessToken,
                                fields: 'id,created_time,field_data',
                                limit: 100
                            };
                            if (after)
                                params.after = after;
                            const leadsRes = yield axios_1.default.get(`${META_GRAPH_URL}/${adId}/leads`, { params });
                            const leads = ((_b = leadsRes.data) === null || _b === void 0 ? void 0 : _b.data) || [];
                            after = ((_e = (_d = (_c = leadsRes.data) === null || _c === void 0 ? void 0 : _c.paging) === null || _d === void 0 ? void 0 : _d.cursors) === null || _e === void 0 ? void 0 : _e.after) || null;
                            const hasNextPage = ((_g = (_f = leadsRes.data) === null || _f === void 0 ? void 0 : _f.paging) === null || _g === void 0 ? void 0 : _g.next) ? true : false;
                            console.log(`[MetaLeads] Ad ${adId}: fetched ${leads.length} leads (page)`);
                            for (const lead of leads) {
                                try {
                                    const fields = {};
                                    for (const f of (lead.field_data || [])) {
                                        fields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
                                    }
                                    const name = fields['full_name'] || fields['name'] || `${fields['first_name'] || ''} ${fields['last_name'] || ''}`.trim() || null;
                                    const email = fields['email'] || fields['email_address'] || null;
                                    const phone = fields['phone_number'] || fields['mobile_number'] || fields['phone'] || null;
                                    yield prisma_1.default.lead.upsert({
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
                                }
                                catch (e) {
                                    console.warn(`[MetaLeads] Skipping lead ${lead.id}: ${e.message}`);
                                    skipped++;
                                }
                            }
                            if (!hasNextPage)
                                break;
                        } while (after);
                    }
                }
            }
            catch (error) {
                console.error('[MetaLeads] syncLeads error:', ((_h = error.response) === null || _h === void 0 ? void 0 : _h.data) || error.message);
                throw error;
            }
            return { synced, skipped };
        });
    }
}
exports.MetaLeadsService = MetaLeadsService;
