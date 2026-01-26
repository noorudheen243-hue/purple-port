import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { ArrowLeft, Clock, User as UserIcon, Trash2, Eye, FileText, Play, X, Pencil, Send, Link as LinkIcon, Paperclip, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { getAssetUrl } from '../../lib/utils';
import { Dialog, DialogContent } from '../../components/ui/dialog';

const TaskDetail = () => {
    const { id } = useParams();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // -- STATE & HOOKS (Moved to Top to fix React Error #310) --
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');
    const [commentText, setCommentText] = useState('');
    const [previewAsset, setPreviewAsset] = useState<any>(null);
    const [timerDuration, setTimerDuration] = useState(0);

    // -- QUERIES --
    const { data: task, isLoading } = useQuery({
        queryKey: ['task', id],
        queryFn: async () => {
            const { data } = await api.get(`/tasks/${id}`);
            return data;
        }
    });

    const activeLog = task?.timeLogs?.[0]; // Provided by backend if running

    // -- EFFECTS --
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

    // -- MUTATIONS --

    // 1. Update Task (Description etc)
    const updateTaskMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.put(`/tasks/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task', id] });
            setIsEditingDescription(false);
        }
    });

    // 2. Timer Controls
    const timerMutation = useMutation({
        mutationFn: async (action: 'start' | 'stop') => {
            return await api.post(`/tasks/${id}/timer/${action}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', id] })
    });

    // 3. Status Change (Auto-Timer Logic)
    const statusMutation = useMutation({
        mutationFn: async (newStatus: string) => {
            return await api.patch(`/tasks/${id}`, { status: newStatus });
        },
        onSuccess: (_, newStatus) => {
            queryClient.invalidateQueries({ queryKey: ['task', id] });

            if (newStatus !== 'PLANNED' && newStatus !== 'COMPLETED' && !activeLog) {
                timerMutation.mutate('start');
            } else if (newStatus === 'COMPLETED' && activeLog) {
                timerMutation.mutate('stop');
            }
        }
    });

    // 4. Assets
    const deleteAssetMutation = useMutation({
        mutationFn: async (assetId: string) => {
            return await api.delete(`/assets/${assetId}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', id] })
    });

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (file.size > 50 * 1024 * 1024) {
                alert('File size exceeds 50MB limit.');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

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

    // 5. Comments
    const commentMutation = useMutation({
        mutationFn: async (content: string) => {
            return await api.post('/comments', { task_id: id, content });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task', id] });
            setCommentText('');
        }
    });

    // -- HANDLERS --
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleSaveDescription = () => {
        updateTaskMutation.mutate({ description: editedDescription });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            uploadMutation.mutate(e.target.files[0]);
        }
    };

    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (commentText.trim()) {
            commentMutation.mutate(commentText);
        }
    };

    // -- RENDER CHECKS --
    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading task...</div>;
    if (!task) return <div className="p-8 text-center text-red-500">Task not found</div>;

    const qixId = `QIX${(task.sequence_id || 0).toString().padStart(8, '0')}`;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard/tasks" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">{task.title}</h1>
                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500">{qixId}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <span className={`px-2 py-0.5 rounded-full font-medium ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                {task.status.replace('_', ' ')}
                            </span>
                            {task.priority && <span className="uppercase">{task.priority} Priority</span>}
                            <span>• Created {format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Timer Controls */}
                    {activeLog ? (
                        <div className="flex items-center gap-3 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 animate-pulse">
                            <Clock size={16} className="text-red-500" />
                            <span className="font-mono font-bold text-red-600 w-16 text-center">{formatDuration(timerDuration)}</span>
                            <button
                                onClick={() => timerMutation.mutate('stop')}
                                className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                                title="Stop Timer"
                            >
                                <div className="w-2 h-2 bg-white rounded-sm" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => timerMutation.mutate('start')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full hover:bg-green-100 border border-green-200 transition-colors"
                        >
                            <Play size={14} /> <span className="text-xs font-semibold">Start Timer</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto h-full">

                    {/* Main Content (Left Column) */}
                    <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2">

                        {/* 1. Description Section */}
                        <div className="bg-card border border-border rounded-lg p-6 shadow-sm group relative">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-lg">Description</h3>
                                {!isEditingDescription && (
                                    <button
                                        onClick={() => {
                                            setEditedDescription(task.description || '');
                                            setIsEditingDescription(true);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-purple-600"
                                        title="Edit Description"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                )}
                            </div>

                            {isEditingDescription ? (
                                <div className="space-y-3 animate-in fade-in">
                                    <textarea
                                        value={editedDescription}
                                        onChange={(e) => setEditedDescription(e.target.value)}
                                        className="w-full p-3 border rounded-md min-h-[150px] focus:ring-2 focus:ring-purple-200 outline-none resize-y"
                                        placeholder="Enter task description..."
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setIsEditingDescription(false)}
                                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveDescription}
                                            disabled={updateTaskMutation.isPending}
                                            className="px-4 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-md flex items-center gap-2"
                                        >
                                            {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm">
                                    {task.description || <span className="italic text-gray-400">No description provided.</span>}
                                </p>
                            )}
                        </div>

                        {/* 2. Reference Attachments (Middle) */}
                        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Paperclip size={18} /> Reference Attachments
                                </h3>
                                <label className="cursor-pointer text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors">
                                    <Upload size={14} /> Upload New
                                    <input type="file" className="hidden" multiple onChange={handleFileUpload} />
                                </label>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {task.assets?.length === 0 && <div className="col-span-full text-sm text-muted-foreground italic text-center py-6 bg-gray-50 rounded-lg border border-dashed">No attachments found.</div>}
                                {task.assets?.map((asset: any) => {
                                    const isImage = asset.file_type?.startsWith('image/');
                                    const isVideo = asset.file_type?.startsWith('video/');
                                    // Robust check for link type
                                    const isLink = asset.file_type === 'link/url' || asset.file_type?.includes('link');

                                    return (
                                        <div key={asset.id} className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-all h-40">
                                            {/* Preview */}
                                            <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden relative cursor-pointer" onClick={() => setPreviewAsset(asset)}>
                                                {isImage ? (
                                                    <img src={getAssetUrl(asset.file_url)} className="w-full h-full object-cover" />
                                                ) : isVideo ? (
                                                    <video src={getAssetUrl(asset.file_url)} className="w-full h-full object-cover opacity-80" />
                                                ) : isLink ? (
                                                    <div className="text-center px-4 w-full flex flex-col items-center">
                                                        <LinkIcon size={24} className="text-blue-500 mb-2" />
                                                        <a
                                                            href={asset.file_url.startsWith('http') ? asset.file_url : `https://${asset.file_url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-[10px] text-blue-600 block w-full hover:text-blue-800 break-all leading-tight bg-blue-50/50 px-2 py-1 rounded"
                                                        >
                                                            {asset.original_name || asset.file_url}
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <FileText size={32} className="text-gray-400" />
                                                )}

                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); setPreviewAsset(asset); }} className="bg-white text-gray-800 p-1.5 rounded-full hover:bg-purple-50 hover:text-purple-600"><Eye size={16} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); deleteAssetMutation.mutate(asset.id); }} className="bg-white text-red-600 p-1.5 rounded-full hover:bg-red-50"><Trash2 size={16} /></button>
                                                </div>
                                            </div>

                                            <div className="p-2 bg-white border-t text-xs">
                                                <div className="font-medium truncate" title={asset.original_name}>{asset.original_name}</div>
                                                <div className="text-gray-400 text-[10px]">{format(new Date(asset.createdAt), 'MMM d, h:mm a')}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Comments Section (Bottom) */}
                        <div className="bg-card border border-border rounded-lg flex flex-col shadow-sm overflow-hidden min-h-[400px]">
                            <div className="p-4 border-b font-semibold bg-muted/30">Activity & Comments</div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {task.comments?.map((comment: any) => {
                                    const isSystem = comment.content.startsWith('System:');

                                    if (isSystem) {
                                        return (
                                            <div key={comment.id} className="flex justify-center my-4">
                                                <span className="text-xs text-center bg-gray-100 text-gray-500 px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                                    {comment.content.replace('System: ', '')}
                                                    <span className="ml-2 text-[10px] text-gray-400 opacity-75">
                                                        • {format(new Date(comment.createdAt), 'h:mm a, MMM d')}
                                                    </span>
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={comment.id} className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                                                {comment.author.avatar_url ? (
                                                    <img src={getAssetUrl(comment.author.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    comment.author.full_name.charAt(0)
                                                )}
                                            </div>
                                            <div className="w-full">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-sm">{comment.author.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                                                </div>
                                                <div className="text-sm text-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">
                                                    {comment.content}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="p-4 border-t bg-background">
                                <form onSubmit={handlePostComment} className="flex gap-2 items-end">
                                    <textarea
                                        className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 rounded-md border border-input bg-background resize-y text-sm"
                                        placeholder="Write a comment... (Shift+Enter for new line)"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handlePostComment(e);
                                            }
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-primary text-primary-foreground h-10 w-10 flex items-center justify-center rounded-md hover:bg-primary/90 mb-0.5"
                                        disabled={commentMutation.isPending}
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar (Right Column) */}
                    <div className="lg:col-span-1 grid grid-cols-1 gap-3 content-start">
                        {/* Status Select */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm sticky top-0">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Status</label>
                            <select
                                className="w-full p-2 border rounded-md text-sm bg-gray-50"
                                value={task.status}
                                onChange={(e) => statusMutation.mutate(e.target.value)}
                            >
                                <option value="PLANNED">Planned</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="ON_HOLD">On Hold</option>
                            </select>
                        </div>

                        {/* Assignment Details Card */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Assignment Details</h4>

                            {/* Assigned By */}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Assigned By:</span>
                                <div className="flex items-center gap-2">
                                    {task.assigned_by?.avatar_url ? (
                                        <img src={getAssetUrl(task.assigned_by.avatar_url)} className="w-6 h-6 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                            {task.assigned_by?.full_name?.charAt(0) || '?'}
                                        </div>
                                    )}
                                    <span className="font-medium">{task.assigned_by?.full_name || 'System'}</span>
                                </div>
                            </div>

                            {/* Assigned To */}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Assigned To:</span>
                                <div className="flex items-center gap-2">
                                    {task.assignee ? (
                                        <>
                                            {task.assignee.avatar_url ? (
                                                <img src={getAssetUrl(task.assignee.avatar_url)} className="w-6 h-6 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                                                    {task.assignee.full_name?.charAt(0)}
                                                </div>
                                            )}
                                            <span className="font-medium">{task.assignee.full_name}</span>
                                        </>
                                    ) : (
                                        <span className="text-gray-400 italic">Unassigned</span>
                                    )}
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="pt-2 border-t mt-2 space-y-2">
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span>Created:</span>
                                    <span className="font-mono">{new Date(task.createdAt).toLocaleString()}</span>
                                </div>
                                {task.due_date && (
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span>Due Date:</span>
                                        <span className="font-mono text-red-500 font-medium">{new Date(task.due_date).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Asset Preview Modal */}
                    <Dialog open={!!previewAsset} onOpenChange={(open) => !open && setPreviewAsset(null)}>
                        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none text-white">
                            <div className="relative w-full h-[80vh] flex items-center justify-center">
                                <button onClick={() => setPreviewAsset(null)} className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors">
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
                                        <a href={getAssetUrl(previewAsset?.file_url)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block bg-white text-black px-4 py-2 rounded hover:bg-gray-200">
                                            Download / Open Original
                                        </a>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                </div >
            </div >
        </div >
    );
};

export default TaskDetail;

