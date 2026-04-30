import { create } from 'zustand';
import api from '../lib/api';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    department: string;
    avatar_url?: string;
    linked_client_id?: string;
    staffProfile?: {
        date_of_birth: string | null;
        date_of_joining: string | null;
    };
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    checkAuth: async () => {
        try {
            const { data } = await api.get('/auth/me');
            sessionStorage.clear();
            set({ user: data, isAuthenticated: true, isLoading: false });
        } catch (error) {
            localStorage.removeItem('auth_token');
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },

    login: async (credentials) => {
        const { data } = await api.post('/auth/login', credentials);
        sessionStorage.clear();
        
        // Persist token for header-based auth fallback
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }
        
        set({ user: data, isAuthenticated: true });
    },

    register: async (registerData) => {
        const { data } = await api.post('/auth/register', registerData);
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }
        set({ user: data, isAuthenticated: true });
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (e) {
            console.warn('Logout request failed, clearing local state anyway');
        }
        sessionStorage.clear();
        localStorage.removeItem('auth_token');
        set({ user: null, isAuthenticated: false });
    },
}));
