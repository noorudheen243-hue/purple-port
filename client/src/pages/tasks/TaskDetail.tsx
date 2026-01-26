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

    // ... (Previous imports)
    import { ArrowLeft, Paperclip, Send, Clock, User as UserIcon, Trash2, Eye, FileText, Play, X, Pencil, Check as CheckIcon, Save } from 'lucide-react';
    // ...

    // ADDED: State for Description Editing
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');

    // ADDED: Update Task Mutation
    const updateTaskMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.put(`/tasks/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task', id] });
            setIsEditingDescription(false);
        }
    });

    // ... (Existing Timer Logic) ...

    const handleSaveDescription = () => {
        updateTaskMutation.mutate({ description: editedDescription });
    };

    // ... (Inside Return) ...

    {/* Main Content */ }
    <div className="lg:col-span-2 flex flex-col overflow-hidden h-full">

        {/* Description Section with Edit Mode */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6 shadow-sm group relative">
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
                ))}
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

    {/* Sidebar */ }
    // ... (Sidebar Code remains, checking Assets Section) ... 

    <div className="grid grid-cols-1 gap-3"> {/* Changed to 1 col for bigger cards if needed, or keeping 2 */}
        {task.assets?.length === 0 && <div className="col-span-1 text-xs text-muted-foreground italic text-center py-4">No assets attached.</div>}
        {task.assets?.map((asset: any) => {
            const isImage = asset.file_type?.startsWith('image/');
            const isVideo = asset.file_type?.startsWith('video/');
            const isLink = asset.file_type === 'link/url';

            return (
                <div key={asset.id} className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-all">
                    {/* Asset Preview Area */}
                    <div className="h-32 bg-gray-50 flex items-center justify-center overflow-hidden relative border-b border-gray-100">
                        {isImage ? (
                            <img src={getAssetUrl(asset.file_url)} className="w-full h-full object-cover" />
                        ) : isVideo ? (
                            <video src={getAssetUrl(asset.file_url)} className="w-full h-full object-cover opacity-80" />
                        ) : isLink ? (
                            <div className="text-center px-4">
                                <LinkIcon size={32} className="mx-auto text-blue-500 mb-2" />
                                <p className="text-xs text-blue-600 truncate underline">{asset.file_url}</p>
                            </div>
                        ) : (
                            <FileText size={32} className="text-gray-400" />
                        )}
                    </div>

                    <div className="p-3">
                        <div className="text-sm font-medium truncate mb-1" title={asset.original_name}>{asset.original_name}</div>
                        <div className="text-[10px] text-gray-500 mb-3">
                            {isLink ? 'External Link' : `${(asset.size_bytes / 1024 / 1024).toFixed(1)} MB`} • {format(new Date(asset.createdAt), 'MMM d')}
                        </div>

                        {/* Bigger Action Buttons */}
                        <div className="flex gap-2">
                            {isLink ? (
                                <a
                                    href={asset.file_url}
                                    target="_blank"
                                    rel="noopener"
                                    className="flex-1 bg-blue-50 text-blue-700 py-1.5 rounded text-xs font-semibold hover:bg-blue-100 flex items-center justify-center gap-1"
                                >
                                    <LinkIcon size={12} /> Open
                                </a>
                            ) : (
                                <button
                                    onClick={() => setPreviewAsset(asset)}
                                    className="flex-1 bg-purple-50 text-purple-700 py-1.5 rounded text-xs font-semibold hover:bg-purple-100 flex items-center justify-center gap-1"
                                >
                                    <Eye size={12} /> View
                                </button>
                            )}

                            <button
                                onClick={(e) => { e.stopPropagation(); deleteAssetMutation.mutate(asset.id); }}
                                className="px-3 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center justify-center border border-red-100"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>

    {/* Asset Preview Modal */ }
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
                </div >
            </div >
        </div >
    );
};

export default TaskDetail;
