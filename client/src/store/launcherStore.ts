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

interface ActiveWidget {
    id: string; // appId
    title: string;
    componentType: 'CALCULATOR' | 'NOTEPAD';
    isMinimized: boolean;
}

interface LauncherStore {
    isOpen: boolean;
    apps: LauncherApp[];
    searchQuery: string;
    isLoading: boolean;
    activeWidgets: ActiveWidget[]; // New State

    toggleLauncher: () => void;
    setOpen: (open: boolean) => void;
    setSearchQuery: (query: string) => void;

    fetchApps: () => Promise<void>;
    createApp: (data: { name: string, url: string, icon: string }) => Promise<void>;
    togglePin: (appId: string) => Promise<void>;
    recordUsage: (appId: string) => Promise<void>;
    executeApp: (app: LauncherApp) => Promise<void>;
    deleteApp: (appId: string) => Promise<void>;

    // Widget Actions
    openWidget: (app: LauncherApp) => void;
    closeWidget: (appId: string) => void;
    minimizeWidget: (appId: string) => void;
}

export const useLauncherStore = create<LauncherStore>((set, get) => ({
    isOpen: false,
    apps: [],
    searchQuery: '',
    isLoading: false,
    activeWidgets: [],

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
        } catch (error) {
            console.error('Failed to record usage', error);
        }
    },

    openWidget: (app) => {
        const { activeWidgets } = get();
        // Check if already open
        const exists = activeWidgets.find(w => w.id === app.id);

        let type: 'CALCULATOR' | 'NOTEPAD' | null = null;
        if (app.name.toLowerCase().includes('calculator')) type = 'CALCULATOR';
        if (app.name.toLowerCase().includes('notepad')) type = 'NOTEPAD';

        if (!type) return; // Should not happen if called correctly

        if (exists) {
            // Restore if minimized
            set({
                activeWidgets: activeWidgets.map(w =>
                    w.id === app.id ? { ...w, isMinimized: false } : w
                ),
                isOpen: false // Close launcher
            });
        } else {
            set({
                activeWidgets: [...activeWidgets, {
                    id: app.id,
                    title: app.name,
                    componentType: type,
                    isMinimized: false
                }],
                isOpen: false // Close launcher
            });
        }
    },

    closeWidget: (appId) => {
        set(state => ({
            activeWidgets: state.activeWidgets.filter(w => w.id !== appId)
        }));
    },

    minimizeWidget: (appId) => {
        set(state => ({
            activeWidgets: state.activeWidgets.map(w =>
                w.id === appId ? { ...w, isMinimized: true } : w
            )
        }));
    },

    executeApp: async (app) => {
        // Record Usage
        get().recordUsage(app.id);

        // INTERCEPT: Check for Widget Apps
        const name = app.name.toLowerCase();
        if (name.includes('calculator') || name.includes('notepad')) {
            get().openWidget(app);
            return;
        }

        if (app.type === 'WEB' && app.url) {
            // Fix: Internal Routes should open in same tab to avoid popup blockers and improve UX
            if (app.url.startsWith('/')) {
                window.location.href = app.url;
            } else {
                window.open(app.url, '_blank');
            }
        } else if (app.type === 'LOCAL' && app.command) {
            // Attempt Local Execution via Server (Only works if Hosting = Client)
            try {
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
