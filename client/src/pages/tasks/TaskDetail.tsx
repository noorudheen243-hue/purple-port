import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { ArrowLeft, Paperclip, Send, Clock, User as UserIcon, Trash2, Eye, FileText, Play, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { getAssetUrl } from '../../lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '../../components/ui/dialog';
import * as Select from '@radix-ui/react-select'; // Using native HTML select for simplicity or if UI component complexity is high. 
// Actually sticking to standard HTML select or if I want the UI component I need to check its export.
// Let's use standard HTML select or a simple styling for now to avoid complexity with Radix/UI imports if I can't see the file content.
// But I saw select.tsx. Let's try to use standard tailored UI if possible, but for speed standard Select with custom styling is safer unless I read select.tsx.
// I will use standard standard HTML select styled beautifully.


const TaskDetail = () => {
    const { id } = useParams();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [commentText, setCommentText] = useState('');
    const [previewAsset, setPreviewAsset] = useState<any>(null); // For Modal

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



    // Status Mutation with Auto-Timer
    const statusMutation = useMutation({
        mutationFn: async (newStatus: string) => {
            return await api.patch(`/tasks/${id}`, { status: newStatus });
        },
        onSuccess: (_, newStatus) => {
            queryClient.invalidateQueries({ queryKey: ['task', id] });

            // Logic: Start Timer if status changed FROM 'PLANNED' (or just IS NOT Planned/Completed) to something active
            // AND ensure we don't start if already running.
            // Requirement: "changed the staus from 'planned' from any other status need to start the timer"
            // "once the status 'Completed' the stop the timer"

            if (newStatus !== 'PLANNED' && newStatus !== 'COMPLETED' && !activeLog) {
                timerMutation.mutate('start');
            } else if (newStatus === 'COMPLETED' && activeLog) {
                timerMutation.mutate('stop');
            }
        }
    });

    const timerMutation = useMutation({
        mutationFn: async (action: 'start' | 'stop') => {
            return await api.post(`/tasks/${id}/timer/${action}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', id] })
    });

    // Delete Asset Mutation
    const deleteAssetMutation = useMutation({
        mutationFn: async (assetId: string) => {
            return await api.delete(`/assets/${assetId}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', id] })
    });

    // Upload Logic
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (file.size > 50 * 1024 * 1024) {
                alert('File size exceeds 50MB limit.');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            // Non-interactive upload
            const uploadRes = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Link to Task
            return await api.post('/assets', {
                task_id: id,
                original_name: file.name,
                file_url: uploadRes.data.url,
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
                        <select
                            value={task.status}
                            onChange={(e) => statusMutation.mutate(e.target.value)}
                            disabled={statusMutation.isPending}
                            className={`text-xs px-2 py-1 rounded font-medium border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-primary outline-none transition-colors
                                ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                        'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            {['PLANNED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ON_HOLD'].map(s => (
                                <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                        </select>
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
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                                        {comment.author.avatar_url ? (
                                            <img src={getAssetUrl(comment.author.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            comment.author.full_name.charAt(0)
                                        )}
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
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs overflow-hidden">
                                    {task.assignee?.avatar_url ? (
                                        <img src={getAssetUrl(task.assignee.avatar_url)} alt="Assignee" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon size={14} />
                                    )}
                                </div>
                                <span className="text-sm font-medium">{task.assignee?.full_name || 'Unassigned'}</span>
                            </div>
                        </div>

                        {/* Assigned By Section */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Assigned By</label>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs overflow-hidden">
                                    {task.assigned_by?.avatar_url ? (
                                        <img src={getAssetUrl(task.assigned_by.avatar_url)} alt="Reporter" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon size={14} />
                                    )}
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

                        <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
                            {task.assets?.length === 0 && <div className="col-span-2 text-xs text-muted-foreground italic text-center py-4">No assets attached.</div>}
                            {task.assets?.map((asset: any) => {
                                const isImage = asset.file_type?.startsWith('image/');
                                const isVideo = asset.file_type?.startsWith('video/');

                                return (
                                    <div key={asset.id} className="relative group bg-muted/30 border border-border rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                        <div
                                            className="aspect-video bg-gray-100 flex items-center justify-center cursor-pointer overflow-hidden relative"
                                            onClick={() => setPreviewAsset(asset)}
                                        >
                                            {isImage ? (
                                                <img
                                                    src={getAssetUrl(asset.file_url)}
                                                    onError={(e) => {
                                                        // Fallback debugging
                                                        console.error("Asset Load Error:", asset.file_url);
                                                        e.currentTarget.src = 'https://placehold.co/600x400?text=Error';
                                                    }}
                                                    alt="Asset"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : isVideo ? (
                                                <div className="relative w-full h-full flex items-center justify-center bg-black/5">
                                                    <video src={getAssetUrl(asset.file_url)} className="w-full h-full object-cover opacity-80" />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                                                        <Play size={24} fill="white" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <FileText size={32} className="text-muted-foreground" />
                                            )}

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <Eye className="text-white drop-shadow-md" size={20} />
                                            </div>
                                        </div>

                                        <div className="p-2 flex items-center justify-between bg-white dark:bg-card">
                                            <div className="flex-1 overflow-hidden mr-2">
                                                <div className="text-xs font-medium truncate" title={asset.original_name}>{asset.original_name}</div>
                                                <div className="text-[10px] text-muted-foreground">{(asset.size_bytes / 1024 / 1024).toFixed(1)} MB • {format(new Date(asset.createdAt), 'MMM d')}</div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteAssetMutation.mutate(asset.id); }}
                                                className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                                title="Delete Asset"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Asset Preview Modal */}
                    <Dialog open={!!previewAsset} onOpenChange={(open) => !open && setPreviewAsset(null)}>
                        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none text-white">
                            <div className="relative w-full h-[80vh] flex items-center justify-center">
                                <button
                                    onClick={() => setPreviewAsset(null)}
                                    className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>

                                {previewAsset?.file_type?.startsWith('image/') ? (
                                    <img src={getAssetUrl(previewAsset.file_url)} className="max-w-full max-h-full object-contain" />
                                ) : previewAsset?.file_type?.startsWith('video/') ? (
                                    <video src={getAssetUrl(previewAsset.file_url)} controls autoPlay className="max-w-full max-h-full" />
                                ) : (
                                    <div className="text-center p-10">
                                        <FileText size={64} className="mx-auto mb-4 text-gray-400" />
                                        <p className="text-xl font-semibold">{previewAsset?.original_name}</p>
                                        <a
                                            href={getAssetUrl(previewAsset?.file_url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-4 inline-block bg-white text-black px-4 py-2 rounded hover:bg-gray-200"
                                        >
                                            Download / Open Original
                                        </a>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
};

export default TaskDetail;
