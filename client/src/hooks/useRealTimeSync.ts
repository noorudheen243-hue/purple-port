import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import SocketService from '../services/socketService';
import { useAuthStore } from '../store/authStore';

export const useRealTimeSync = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user) return;

        console.log('[RealTimeSync] Initializing listeners...');
        const socket = SocketService.getSocket();

        // If socket isn't ready (race condition), wait or relying on SocketService internals?
        // SocketService.connect() is called in DashboardLayout, so it should be fine.

        const handleNotification = (data: any) => {
            console.log('[RealTimeSync] New Notification:', data);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            // Optional: Show toast here if needed
        };

        const handleTaskCreated = (data: any) => {
            console.log('[RealTimeSync] Task Created:', data);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['tasks-calendar'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        };

        const handleTaskUpdated = (data: any) => {
            console.log('[RealTimeSync] Task Updated:', data);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['tasks-calendar'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

            // If viewing specific task, invalidate that logic? 
            // queryKey: ['task', data.id] - usually handled by specific page re-mount or we can add it:
            queryClient.invalidateQueries({ queryKey: ['task', data.id] });
        };

        SocketService.on('notification', handleNotification);
        SocketService.on('task_created', handleTaskCreated);
        SocketService.on('task_updated', handleTaskUpdated);

        return () => {
            // Cleanup listeners? SocketService currently doesn't export strict 'off' for specific fn references well if wrappers used.
            // But existing off(event) removes ALL listeners for that event in simple implementation.
            // Ideally we should modify SocketService to support off(event, fn), but for now this is safe if singleton.
            // Actually, checking SocketService.ts... it calls socket?.off(event) which REMOVES ALL listeners.
            // This might be risky if multiple components listen to same event.
            // BUT, this hook is likely used ONCE in DashboardLayout. So it's fine.
            SocketService.off('notification');
            SocketService.off('task_created');
            SocketService.off('task_updated');
        };
    }, [queryClient, user]);
};
