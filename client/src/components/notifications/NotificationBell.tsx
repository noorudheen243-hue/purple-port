import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Bell, Check, Sparkles, AlertTriangle, Lightbulb } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'NORMAL' | 'AI'>('NORMAL');
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: notifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => (await api.get('/notifications')).data
    });

    const { data: aiLogs } = useQuery({
        queryKey: ['aiLogs'],
        queryFn: async () => (await api.get('/notifications/ai-logs')).data
    });

    const unreadNormal = notifications?.filter((n: any) => !n.read).length || 0;
    const unreadAI = aiLogs?.length || 0;
    const totalUnread = unreadNormal + unreadAI;

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

    const resolveAILogMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.put(`/notifications/ai-logs/${id}/resolve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['aiLogs'] });
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
                {totalUnread > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-background animate-pulse" />
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                        <div className="p-3 border-b flex justify-between items-center bg-muted/30">
                            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                                <button
                                    onClick={() => setViewMode('NORMAL')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${viewMode === 'NORMAL' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Inbox {unreadNormal > 0 && <span className="bg-red-500 text-white rounded-full px-1.5 ml-1">{unreadNormal}</span>}
                                </button>
                                <button
                                    onClick={() => setViewMode('AI')}
                                    className={`px-3 py-1 flex items-center gap-1 text-xs font-semibold rounded-md transition-colors ${viewMode === 'AI' ? 'bg-indigo-600 shadow-sm text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Sparkles size={12} className={viewMode === 'AI' ? 'text-yellow-300' : ''} />
                                    AI Alerts {unreadAI > 0 && <span className="bg-red-500 text-white rounded-full px-1.5 ml-1">{unreadAI}</span>}
                                </button>
                            </div>
                            
                            {(viewMode === 'NORMAL' && unreadNormal > 0) && (
                                <button
                                    onClick={() => markAllReadMutation.mutate()}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    <Check size={12} /> Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[350px] overflow-y-auto bg-gray-50/30">
                            {viewMode === 'NORMAL' ? (
                                <>
                                    {unreadNormal === 0 ? (
                                        <div className="p-8 text-center text-sm text-muted-foreground">
                                            No new notifications
                                        </div>
                                    ) : (
                                        notifications?.filter((n: any) => !n.read).map((n: any) => (
                                            <div key={n.id} className="p-3 border-b last:border-0 hover:bg-muted/50 transition-colors bg-primary/5">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="text-sm">{n.message}</p>
                                                    <button onClick={() => markReadMutation.mutate(n.id)} className="text-primary hover:text-primary/70" title="Mark as read">
                                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 text-xs">
                                                    <span className="text-muted-foreground">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                                                    {n.link && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                markReadMutation.mutate(n.id);
                                                                setIsOpen(false);
                                                                navigate(n.link!);
                                                            }}
                                                            className="font-semibold text-primary hover:underline ml-auto"
                                                        >View</button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </>
                            ) : (
                                <>
                                    {unreadAI === 0 ? (
                                        <div className="p-8 text-center text-sm text-muted-foreground">
                                            No Smart AI Alerts detected natively.
                                        </div>
                                    ) : (
                                        aiLogs?.map((log: any) => (
                                            <div key={log.id} className={`p-3 border-b border-indigo-100 last:border-0 hover:bg-indigo-50/50 transition-colors bg-indigo-50/30`}>
                                                <div className="flex items-start gap-2">
                                                    {log.alert_type === 'CRITICAL' ? <AlertTriangle size={16} className="text-red-500 mt-1" /> : <Lightbulb size={16} className="text-yellow-600 mt-1" />}
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">{log.title}</h4>
                                                            <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border shadow-sm text-gray-500">Lvl {log.escalation_level}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 leading-snug">{log.message}</p>
                                                        {log.suggestion && (
                                                            <div className="mt-2 bg-yellow-50 text-yellow-800 text-xs p-2 rounded border border-yellow-200">
                                                                <strong>AI Suggestion:</strong> {log.suggestion}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center justify-between mt-3 text-xs">
                                                    <span className="text-gray-400">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                                                    <button onClick={() => resolveAILogMutation.mutate(log.id)} className="font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-100 px-2 py-1 rounded">
                                                        Resolve
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
