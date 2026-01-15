import { create } from 'zustand';
import api from '../lib/api';

interface LauncherApp {
    id: string;
    name: string;
    icon: string;
    type: 'WEB' | 'LOCAL';
    url?: string;
    command?: string;
    is_global: boolean;
    is_pinned: boolean; // Computed from preference
    last_used: string | null;
    usage_count: number;
}

interface LauncherStore {
    isOpen: boolean;
    apps: LauncherApp[];
    searchQuery: string;
    isLoading: boolean;

    toggleLauncher: () => void;
    setOpen: (open: boolean) => void;
    setSearchQuery: (query: string) => void;

    fetchApps: () => Promise<void>;
    createApp: (data: { name: string, url: string, icon: string }) => Promise<void>;
    togglePin: (appId: string) => Promise<void>;
    recordUsage: (appId: string) => Promise<void>;
    executeApp: (app: LauncherApp) => Promise<void>;
    deleteApp: (appId: string) => Promise<void>;
}

export const useLauncherStore = create<LauncherStore>((set, get) => ({
    isOpen: false,
    apps: [],
    searchQuery: '',
    isLoading: false,

    toggleLauncher: () => set(state => ({ isOpen: !state.isOpen })),
    setOpen: (open) => set({ isOpen: open }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    fetchApps: async () => {
        set({ isLoading: true });
        try {
            const { data } = await api.get('/launcher/apps');
            set({ apps: data, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch apps', error);
            set({ isLoading: false });
        }
    },

    createApp: async (data) => {
        try {
            await api.post('/launcher/apps', { ...data, type: 'WEB' });
            await get().fetchApps();
        } catch (error) {
            console.error('Failed to create app', error);
        }
    },

    togglePin: async (appId) => {
        try {
            // Optimistic Update
            const { apps } = get();
            set({
                apps: apps.map(app =>
                    app.id === appId ? { ...app, is_pinned: !app.is_pinned } : app
                ).sort((a, b) => {
                    // Re-sort handled in next fetch, but simple toggle here
                    if (a.id === appId) return !a.is_pinned ? -1 : 1;
                    return 0;
                })
            });

            await api.put(`/launcher/apps/${appId}/pin`);
            await get().fetchApps();
        } catch (error) {
            console.error('Failed to toggle pin', error);
            get().fetchApps(); // Revert
        }
    },

    recordUsage: async (appId) => {
        try {
            await api.post(`/launcher/apps/${appId}/use`);
            // No need to fetch immediately, just background track
        } catch (error) {
            console.error('Failed to record usage', error);
        }
    },

    executeApp: async (app) => {
        // Record Usage
        get().recordUsage(app.id);

        if (app.type === 'WEB' && app.url) {
            window.open(app.url, '_blank');
        } else if (app.type === 'LOCAL' && app.command) {
            // Attempt Local Execution via Server (Only works if Hosting = Client)
            try {
                // If we are strictly in a web browser, we can't do this directly.
                // But we can try the custom protocol approach for some.

                // If it's a known protocol
                if (app.command.includes('://')) {
                    window.location.href = app.command;
                    return;
                }

                // Fallback to Server Execution with Toast Warning
                await api.post('/launcher/exec', { command: app.command });
                // alert(`Sent command "${app.command}" to server.`);
            } catch (error: any) {
                console.error("Exec failed", error);
                alert("Could not execute local command. " + (error.response?.data?.message || ''));
            }
        }
    },

    deleteApp: async (appId) => {
        try {
            await api.delete(`/launcher/apps/${appId}`);
            await get().fetchApps();
        } catch (error) {
            console.error('Failed to delete app', error);
        }
    }
}));
