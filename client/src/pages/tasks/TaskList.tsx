import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { MoreHorizontal, Plus, Pencil, Trash2, Check, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import TaskFormModal from './TaskFormModal';
import ClearTasksModal from '../../components/tasks/ClearTasksModal';
import { useAuthStore } from '../../store/authStore';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import Swal from 'sweetalert2';

const COLUMNS = [
    { id: 'PLANNED', label: 'Planned' },
    { id: 'ASSIGNED', label: 'Assigned' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'REVIEW', label: 'Review' },
    { id: 'REVISION_REQUESTED', label: 'Revision' },
    { id: 'COMPLETED', label: 'Completed' }
];

const TaskBoard = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [taskToEdit, setTaskToEdit] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const { data } = await api.get('/tasks');
            return data;
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return await api.put(`/tasks/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/tasks/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setDeleteId(null);
        }
    });

    const clearActiveMutation = useMutation({
        mutationFn: async () => {
            return await api.delete('/tasks/clear-active');
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            Swal.fire('Cleared!', data.message || 'Active tasks have been wiped.', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to clear tasks', 'error');
        }
    });

    // Group tasks by status
    const tasksByStatus = tasks?.reduce((acc: any, task: any) => {
        const status = task.status;
        if (!acc[status]) acc[status] = [];
        acc[status].push(task);
        return acc;
    }, {});

    const [searchParams, setSearchParams] = useSearchParams();
    const isNewTaskModalOpen = searchParams.get('action') === 'new';

    const handleCloseModal = () => {
        setSearchParams({});
        setTaskToEdit(null);
    };

    if (isLoading) return <div>Loading tasks...</div>;

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDrop = (e: React.DragEvent, status: string) => {
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            updateStatusMutation.mutate({ id: taskId, status });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const canModify = (task: any) => {
        if (!user) return false;
        if (['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'].includes(user.role)) return true;
        if (task.assigned_by?.id === user.id) return true; // Creator
        return false;
    };




    const handleClearTasks = () => {
        Swal.fire({
            title: 'Are you sure?',
            text: "This will wipe out ALL task data (Planned, Assigned, In Progress, Review, Revision) including attachments! This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, wipe it!'
        }).then((result) => {
            if (result.isConfirmed) {
                clearActiveMutation.mutate();
            }
        });
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Task Board</h1>
                <div className="flex gap-2">
                    {user?.role === 'DEVELOPER_ADMIN' && (
                        <button
                            onClick={() => setIsClearModalOpen(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Trash2 size={16} /> Clear All Tasks
                        </button>
                    )}
                    <Link to="?action=new" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2">
                        <Plus size={16} /> New Task
                    </Link>
                </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                {COLUMNS.map(column => (
                    <div
                        key={column.id}
                        className="min-w-[300px] w-[300px] flex flex-col bg-muted/30 rounded-lg border border-border"
                        onDrop={(e) => handleDrop(e, column.id)}
                        onDragOver={handleDragOver}
                    >
                        <div className="p-4 font-semibold text-sm flex justify-between items-center border-b bg-card rounded-t-lg">
                            {column.label}
                            <span className="bg-muted text-xs px-2 py-1 rounded-full">
                                {tasksByStatus?.[column.id]?.length || 0}
                            </span>
                        </div>

                        <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                            {tasksByStatus?.[column.id]?.map((task: any) => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    className="bg-card p-3 rounded-lg border shadow-sm cursor-move hover:border-primary/50 transition-colors group relative flex flex-col gap-2"
                                >
                                    {/* Header: Type, Priority, Date */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider 
                                            ${task.type === 'GRAPHIC' ? 'bg-purple-100 text-purple-700' :
                                                    task.type === 'VIDEO' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {task.type}
                                            </span>
                                            {task.priority === 'URGENT' && <AlertCircle size={12} className="text-red-500" />}
                                        </div>

                                        {/* Action Menu */}
                                        {canModify(task) && (
                                            <div className="absolute top-2 right-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity outline-none bg-white/80 p-1 rounded-full">
                                                        <MoreHorizontal size={14} />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => {
                                                            setTaskToEdit(task);
                                                            setSearchParams({ action: 'new' });
                                                        }}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Modify
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => setDeleteId(task.id)} className="text-red-600 focus:text-red-600">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        )}
                                    </div>

                                    {/* Title & Link */}
                                    <Link to={`/dashboard/tasks/${task.id}`} className="font-semibold text-sm hover:text-primary leading-tight line-clamp-2" title={task.title}>
                                        {task.title}
                                    </Link>

                                    {/* Date & Time */}
                                    <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                        <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                                        <span className="text-gray-300">•</span>
                                        <span>{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>

                                    {/* Footer: People */}
                                    <div className="flex justify-between items-center pt-2 border-t mt-1">
                                        {/* Assigned By (Left) */}
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                            <span className="text-[9px] uppercase tracking-wide opacity-70">By</span>
                                            <div className="flex items-center gap-1" title={`Assigned By: ${task.assigned_by?.full_name || 'System'}`}>
                                                {task.assigned_by?.avatar_url ? (
                                                    <img src={task.assigned_by.avatar_url} className="w-4 h-4 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                                                        {task.assigned_by?.full_name?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                                <span className="truncate max-w-[60px]">{task.assigned_by?.full_name?.split(' ')[0]}</span>
                                            </div>
                                        </div>

                                        {/* Assigned To (Right) */}
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                            <span className="text-[9px] uppercase tracking-wide opacity-70">To</span>
                                            <div className="flex items-center gap-1" title={`Assigned To: ${task.assignee?.full_name || 'Unassigned'}`}>
                                                {task.assignee ? (
                                                    <>
                                                        <span className="truncate max-w-[60px] font-medium text-gray-700">{task.assignee.full_name.split(' ')[0]}</span>
                                                        {task.assignee.avatar_url ? (
                                                            <img src={task.assignee.avatar_url} className="w-5 h-5 rounded-full object-cover ring-1 ring-white shadow-sm" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold ring-1 ring-white shadow-sm">
                                                                {task.assignee.full_name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="italic text-gray-400">Unassigned</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <TaskFormModal
                isOpen={isNewTaskModalOpen || !!taskToEdit}
                onClose={handleCloseModal}
                initialData={taskToEdit}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Task?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this task? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
                        <button
                            onClick={() => deleteId && deleteTaskMutation.mutate(deleteId)}
                            className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-md flex items-center gap-2"
                            disabled={deleteTaskMutation.isPending}
                        >
                            {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clear All Tasks Modal */}
            <ClearTasksModal
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
            />
        </div>
    );
};

export default TaskBoard;
