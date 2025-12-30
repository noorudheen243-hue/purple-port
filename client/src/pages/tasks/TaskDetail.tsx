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

    return (
        <div className="max-w-5xl mx-auto h-[cale(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link to="/dashboard/tasks" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono text-muted-foreground">#{task.id.slice(0, 8)}</span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {task.status}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold">{task.title}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden lg:overflow-visible h-full lg:h-auto">
                {/* Main Content: Description & Activity */}
                <div className="lg:col-span-2 flex flex-col overflow-hidden h-full">
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

                {/* Sidebar: Meta & Assets */}
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
                            <div className="bg-muted rounded p-2 text-center">
                                <span className="text-2xl font-mono block">00:00</span>
                                <button className="text-xs text-primary hover:underline mt-1">Start Timer</button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-sm">Assets</h3>
                            <button className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded flex items-center gap-1">
                                <Paperclip size={12} /> Upload
                            </button>
                        </div>
                        <div className="space-y-2">
                            {task.assets?.length === 0 && <div className="text-xs text-muted-foreground italic">No assets attached.</div>}
                            {task.assets?.map((asset: any) => (
                                <div key={asset.id} className="flex items-center gap-2 p-2 border rounded bg-background">
                                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-[10px] font-mono">
                                        {asset.file_type.split('/')[1]}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="text-xs font-medium truncate" title={asset.original_name}>{asset.original_name}</div>
                                        <div className="text-[10px] text-muted-foreground">v{asset.version} • {format(new Date(asset.createdAt), 'MMM d')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetail;
