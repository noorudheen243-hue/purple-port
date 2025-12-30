import { create } from 'zustand';
import api from '../lib/api';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string; // Simplified to string to avoid mismatch with schema
    department: string;
    avatar_url?: string;
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
            set({ user: data, isAuthenticated: true, isLoading: false });
        } catch (error) {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },

    login: async (credentials) => {
        const { data } = await api.post('/auth/login', credentials);
        set({ user: data, isAuthenticated: true });
    },

    register: async (registerData) => {
        const { data } = await api.post('/auth/register', registerData);
        set({ user: data, isAuthenticated: true });
    },

    logout: async () => {
        await api.post('/auth/logout');
        set({ user: null, isAuthenticated: false });
    },
}));
