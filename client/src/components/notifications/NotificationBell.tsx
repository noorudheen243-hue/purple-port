import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Bell, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: notifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data } = await api.get('/notifications');
            return data;
        },
        refetchInterval: 30000 // Poll every 30s
    });

    const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.put(`/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            return await api.put('/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-accent transition-colors"
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-background animate-pulse" />
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                        <div className="p-3 border-b flex justify-between items-center bg-muted/30">
                            <h3 className="font-semibold text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllReadMutation.mutate()}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    <Check size={12} /> Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[300px] overflow-y-auto">
                            {notifications?.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No notifications
                                </div>
                            ) : (
                                notifications?.map((n: any) => (
                                    <div
                                        key={n.id}
                                        className={`p-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="text-sm">{n.message}</p>
                                            {!n.read && (
                                                <button
                                                    onClick={() => markReadMutation.mutate(n.id)}
                                                    className="text-primary hover:text-primary/70"
                                                    title="Mark as read"
                                                >
                                                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center mt-2 text-xs">
                                            <span className="text-muted-foreground">
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                            </span>
                                            {n.link && (
                                                <Link
                                                    to={n.link}
                                                    onClick={() => setIsOpen(false)}
                                                    className="font-medium hover:underline text-foreground"
                                                >
                                                    View
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
