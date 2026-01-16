import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { ArrowLeft, Paperclip, Send, Clock, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';

const TaskDetail = () => {
    const { id } = useParams();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [commentText, setCommentText] = useState('');

    const { data: task, isLoading } = useQuery({
        queryKey: ['task', id],
        queryFn: async () => {
            const { data } = await api.get(`/tasks/${id}`);
            return data;
        }
    });

    // Timer Logic
    const [timerDuration, setTimerDuration] = useState(0);
    const activeLog = task?.timeLogs?.[0]; // Provided by backend if running

    React.useEffect(() => {
        let interval: any;
        if (activeLog) {
            const startTime = new Date(activeLog.start_time).getTime();
            interval = setInterval(() => {
                const now = new Date().getTime();
                setTimerDuration(Math.floor((now - startTime) / 1000));
            }, 1000);
        } else {
            setTimerDuration(0);
        }
        return () => clearInterval(interval);
    }, [activeLog]);

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const timerMutation = useMutation({
        mutationFn: async (action: 'start' | 'stop') => {
            return await api.post(`/tasks/${id}/timer/${action}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', id] })
    });

    // Upload Logic
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            // Assuming a generic upload endpoint exists, or we use a specific asset upload
            // adapting to: POST /upload -> returns { url, ... } -> POST /assets
            const uploadRes = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Link to Task
            return await api.post('/assets', {
                task_id: id,
                original_name: file.name,
                file_url: uploadRes.data.url, // Corrected: controller returns 'url'
                file_type: file.type,
                size_bytes: file.size
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', id] })
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            uploadMutation.mutate(e.target.files[0]);
        }
    };

    const commentMutation = useMutation({
        mutationFn: async (content: string) => {
            return await api.post('/comments', { task_id: id, content });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task', id] });
            setCommentText('');
        }
    });

    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (commentText.trim()) {
            commentMutation.mutate(commentText);
        }
    };

    if (isLoading) return <div>Loading task...</div>;
    if (!task) return <div>Task not found</div>;

    const qixId = `QIX${(task.sequence_id || 0).toString().padStart(8, '0')}`;

    return (
        <div className="max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link to="/dashboard/tasks" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono text-muted-foreground">#{qixId}</span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {task.status}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold">{task.title}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden lg:overflow-visible h-full lg:h-auto">
                {/* Main Content */}
                <div className="lg:col-span-2 flex flex-col overflow-hidden h-full">
                    {/* ... Description Use Existing ... */}
                    <div className="bg-card border border-border rounded-lg p-6 mb-6 shadow-sm">
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {task.description || 'No description provided.'}
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg flex-1 flex flex-col shadow-sm overflow-hidden">
                        <div className="p-4 border-b font-semibold bg-muted/30">Activity & Comments</div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {task.comments?.map((comment: any) => (
                                <div key={comment.id} className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                                        {comment.author.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm">{comment.author.full_name}</span>
                                            <span className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                                        </div>
                                        <div className="text-sm text-foreground bg-muted/30 p-3 rounded-md">
                                            {comment.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t bg-background">
                            <form onSubmit={handlePostComment} className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 h-10 px-3 rounded-md border border-input bg-background"
                                    placeholder="Write a comment..."
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="bg-primary text-primary-foreground h-10 w-10 flex items-center justify-center rounded-md hover:bg-primary/90"
                                    disabled={commentMutation.isPending}
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Assignee</label>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                                    <UserIcon size={14} />
                                </div>
                                <span className="text-sm font-medium">{task.assignee?.full_name || 'Unassigned'}</span>
                            </div>
                        </div>

                        {/* Assigned By Section */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Assigned By</label>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs">
                                    <UserIcon size={14} />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{task.assigned_by?.full_name || 'System'}</div>
                                    <div className="text-[10px] text-muted-foreground">{format(new Date(task.createdAt), 'MMM d, h:mm a')}</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Due Date</label>
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-muted-foreground" />
                                <span className="text-sm">
                                    {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Tracking</label>
                            <div className={`rounded p-3 text-center transition-colors ${activeLog ? 'bg-red-50' : 'bg-muted'}`}>
                                <span className={`text-2xl font-mono block ${activeLog ? 'text-red-600 animate-pulse' : ''}`}>
                                    {formatDuration(timerDuration)}
                                </span>
                                {activeLog ? (
                                    <button
                                        onClick={() => timerMutation.mutate('stop')}
                                        disabled={timerMutation.isPending}
                                        className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full mt-2 hover:bg-red-200 font-bold"
                                    >
                                        Stop Timer
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => timerMutation.mutate('start')}
                                        disabled={timerMutation.isPending}
                                        className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full mt-2 hover:bg-green-200 font-bold"
                                    >
                                        Start Timer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-sm">Assets</h3>
                            <label className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors">
                                <Paperclip size={12} />
                                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadMutation.isPending} />
                            </label>
                        </div>
                        <div className="space-y-2">
                            {task.assets?.length === 0 && <div className="text-xs text-muted-foreground italic">No assets attached.</div>}
                            {task.assets?.map((asset: any) => (
                                <a
                                    href={asset.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    key={asset.id}
                                    className="flex items-center gap-2 p-2 border rounded bg-background hover:bg-muted/50 transition-colors"
                                >
                                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-[10px] font-mono uppercase">
                                        {asset.file_type?.split('/')[1] || 'file'}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="text-xs font-medium truncate" title={asset.original_name}>{asset.original_name}</div>
                                        <div className="text-[10px] text-muted-foreground">v{asset.version} • {format(new Date(asset.createdAt), 'MMM d')}</div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetail;
