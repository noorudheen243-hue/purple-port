import { create } from 'zustand';
import api from '../lib/api';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string; // Simplified to string to avoid mismatch with schema
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
            sessionStorage.clear(); // Reset notification flags on app load/checkAuth
            set({ user: data, isAuthenticated: true, isLoading: false });
        } catch (error) {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },

    login: async (credentials) => {
        const { data } = await api.post('/auth/login', credentials);
        sessionStorage.clear(); // Clear all session flags on fresh login
        set({ user: data, isAuthenticated: true });
    },

    register: async (registerData) => {
        const { data } = await api.post('/auth/register', registerData);
        set({ user: data, isAuthenticated: true });
    },

    logout: async () => {
        await api.post('/auth/logout');
        sessionStorage.clear(); // Clear all session flags on logout
        set({ user: null, isAuthenticated: false });
    },
}));
