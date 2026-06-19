import { create } from 'zustand';
import api from '../lib/api';

interface CrmUser {
    id: string;
    full_name: string;
    designation: string | null;
    email: string;
    mobile: string | null;
    user_id: string;
    client_id: string;
    campaign_group_id: string | null;
    status: string;
    clientName: string;
    clientLogo: string | null;
    groupName: string;
}

interface CrmAuthState {
    crmUser: CrmUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: any) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useCrmAuthStore = create<CrmAuthState>((set) => ({
    crmUser: null,
    isAuthenticated: false,
    isLoading: true,

    checkAuth: async () => {
        try {
            const token = localStorage.getItem('crm_auth_token');
            // We set the header for fallback authentication in Axios
            const headers = token ? { 'crm-auth-token': token } : undefined;
            const { data } = await api.get('/crm/auth/me', { headers });
            
            set({ crmUser: data.crmUser, isAuthenticated: true, isLoading: false });
        } catch (error) {
            localStorage.removeItem('crm_auth_token');
            set({ crmUser: null, isAuthenticated: false, isLoading: false });
        }
    },

    login: async (credentials) => {
        const { data } = await api.post('/crm/auth/login', credentials);
        
        if (data.token) {
            localStorage.setItem('crm_auth_token', data.token);
        }
        
        set({ crmUser: data.crmUser, isAuthenticated: true });
    },

    logout: async () => {
        try {
            const token = localStorage.getItem('crm_auth_token');
            const headers = token ? { 'crm-auth-token': token } : undefined;
            await api.post('/crm/auth/logout', {}, { headers });
        } catch (e) {
            console.warn('CRM Logout request failed, clearing local state anyway');
        }
        localStorage.removeItem('crm_auth_token');
        set({ crmUser: null, isAuthenticated: false });
    },
}));
