import api from '../lib/api';

export const syncCampaigns = async (clientId?: string) => {
    const res = await api.post('/marketing-beta/campaigns/sync', { clientId });
    return res.data;
};

export const getCampaigns = async (clientId?: string, groupId?: string) => {
    const res = await api.get('/marketing-beta/campaigns', { params: { clientId, groupId } });
    return res.data;
};

export const getInsights = async (clientId?: string) => {
    const res = await api.get('/marketing-beta/insights', { params: { clientId } });
    return res.data;
};

export const getAutomations = async (clientId?: string) => {
    const res = await api.get('/marketing-beta/automations', { params: { clientId } });
    return res.data;
};

export const getGroups = async (clientId?: string) => {
    const res = await api.get('/marketing-beta/groups', { params: { clientId } });
    return res.data;
};
