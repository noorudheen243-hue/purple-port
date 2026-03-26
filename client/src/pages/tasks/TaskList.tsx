import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Plus, Pencil, Trash2, Calendar as CalIcon, Filter, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import TaskFormModal from './TaskFormModal';
import ClearTasksModal from '../../components/tasks/ClearTasksModal';
import { useAuthStore } from '../../store/authStore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import Swal from 'sweetalert2';

interface TaskListProps {
    forcedFilters?: any;
    hideTitle?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ forcedFilters, hideTitle }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // Default to Current Month
    const [assignerFilter, setAssignerFilter] = useState('ALL');
    const [assigneeFilter, setAssigneeFilter] = useState('ALL');

    const [taskToEdit, setTaskToEdit] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    // Fetch Tasks
    const { data: rawTasks, isLoading } = useQuery({
        queryKey: ['tasks', 'board-table', month],
        queryFn: async () => {
            const params: any = { ...forcedFilters };
            if (month) {
                params.start_date = `${month}-01`;
                const date = new Date(month);
                params.end_date = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
            }
            const { data } = await api.get('/tasks', { params });
            return data;
        }
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/tasks/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setDeleteId(null);
        }
    });

    const clearActiveMutation = useMutation({
        mutationFn: async () => await api.delete('/tasks/clear-active'),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            Swal.fire('Cleared!', data.message || 'Active tasks have been wiped.', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to clear tasks', 'error');
        }
    });

    // Filtering Logic
    const filteredTasks = useMemo(() => {
        if (!rawTasks) return [];
        return rawTasks.filter((task: any) => {
            const matchAssigner = assignerFilter === 'ALL' || task.assigned_by?.id === assignerFilter;
            const matchAssignee = assigneeFilter === 'ALL' || task.assignee?.id === assigneeFilter;
            return matchAssigner && matchAssignee;
        });
    }, [rawTasks, assignerFilter, assigneeFilter]);

    // Unique Users for Dropdowns
    const { assigners, assignees } = useMemo(() => {
        if (!rawTasks) return { assigners: [], assignees: [] };

        const assignerMap = new Map();
        const assigneeMap = new Map();

        rawTasks.forEach((task: any) => {
            if (task.assigned_by) {
                assignerMap.set(task.assigned_by.id, task.assigned_by.full_name);
            }
            if (task.assignee) {
                assigneeMap.set(task.assignee.id, task.assignee.full_name);
            }
        });

        return {
            assigners: Array.from(assignerMap.entries()).map(([id, name]) => ({ id, name })),
            assignees: Array.from(assigneeMap.entries()).map(([id, name]) => ({ id, name }))
        };
    }, [rawTasks]);

    // Summary Calculations
    const summary = useMemo(() => {
        const counts = { TOTAL: 0, PLANNED: 0, ASSIGNED: 0, IN_PROGRESS: 0, REVIEW: 0, REVISION: 0, REWORK: 0, COMPLETED: 0 };
        filteredTasks.forEach((t: any) => {
            counts.TOTAL++;
            if (t.status === 'REVISION_REQUESTED') counts.REVISION++;
            else if (counts[t.status as keyof typeof counts] !== undefined) {
                counts[t.status as keyof typeof counts]++;
            }
        });
        return counts;
    }, [filteredTasks]);

    const isNewTaskModalOpen = searchParams.get('action') === 'new';

    const handleCloseModal = () => {
        setSearchParams({});
        setTaskToEdit(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'REVIEW': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'REVISION_REQUESTED': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'REWORK': return 'bg-red-100 text-red-700 border-red-200';
            case 'ASSIGNED': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const canModify = (task: any) => {
        if (!user) return false;
        if (['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'].includes(user.role)) return true;
        if (task.assigned_by?.id === user.id) return true;
        return false;
    };

    // Client restriction guard
    if (user?.role === 'CLIENT') {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
                <p className="text-gray-500 mt-2">You do not have permission to view internal tasks.</p>
                <Link to="/dashboard/client-portal" className="mt-6 px-4 py-2 bg-primary text-white rounded-md">Return to Portal</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            {!hideTitle && (
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Layers className="text-primary" />
                            Task Board
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        {user?.role === 'DEVELOPER_ADMIN' && (
                            <button
                                onClick={() => setIsClearModalOpen(true)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors"
                            >
                                <Trash2 size={16} /> Clear All Tasks
                            </button>
                        )}
                        <Link to="?action=new" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 shadow-sm transition-colors">
                            <Plus size={16} /> New Task
                        </Link>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Total Tasks</span>
                    <span className="text-2xl font-black text-gray-900 mt-1">{summary.TOTAL}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Planned</span>
                    <span className="text-2xl font-black text-gray-700 mt-1">{summary.PLANNED}</span>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl shadow-sm border border-indigo-100 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-tighter">Assigned</span>
                    <span className="text-2xl font-black text-indigo-800 mt-1">{summary.ASSIGNED}</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-100 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter">In Prog</span>
                    <span className="text-2xl font-black text-blue-800 mt-1">{summary.IN_PROGRESS}</span>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl shadow-sm border border-purple-100 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-bold text-purple-600 uppercase tracking-tighter">Review</span>
                    <span className="text-2xl font-black text-purple-800 mt-1">{summary.REVIEW}</span>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl shadow-sm border border-orange-100 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-tighter">Revision</span>
                    <span className="text-2xl font-black text-orange-800 mt-1">{summary.REVISION}</span>
                </div>
                <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-100 flex flex-col justify-center items-center text-center relative overflow-hidden">
                    <span className="text-xs font-bold text-red-600 uppercase tracking-tighter relative z-10">Rework</span>
                    <span className="text-2xl font-black text-red-800 mt-1 relative z-10">{summary.REWORK}</span>
                </div>
                <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-100 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-bold text-green-600 uppercase tracking-tighter">Completed</span>
                    <span className="text-2xl font-black text-green-800 mt-1">{summary.COMPLETED}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Filter size={18} className="text-primary" />
                    Filters:
                </div>

                <div className="flex items-center gap-2">
                    <CalIcon size={16} className="text-gray-400" />
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Assigner:</span>
                    <select
                        value={assignerFilter}
                        onChange={(e) => setAssignerFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[150px]"
                    >
                        <option value="ALL">All Staff</option>
                        {assigners.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Assignee:</span>
                    <select
                        value={assigneeFilter}
                        onChange={(e) => setAssigneeFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[150px]"
                    >
                        <option value="ALL">All Staff</option>
                        {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold">
                            <tr>
                                <th className="px-6 py-4 w-16 text-center">S.No</th>
                                <th className="px-6 py-4">Task Details</th>
                                <th className="px-6 py-4">Date Assigned</th>
                                <th className="px-6 py-4">Date Completed</th>
                                <th className="px-6 py-4">Assigned By</th>
                                <th className="px-6 py-4">Assigned To</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-3">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                            Loading tasks...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Layers className="w-12 h-12 text-gray-300" />
                                            <p className="text-lg font-medium text-gray-600">No tasks found</p>
                                            <p className="text-sm">Try adjusting your filters to see more results.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((task: any, index: number) => (
                                    <tr
                                        key={task.id}
                                        onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                                        className="hover:bg-gray-50/50 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4 text-center text-gray-400 font-medium">
                                            {index + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900 group-hover:text-primary transition-colors max-w-xs truncate" title={task.title}>
                                                {task.title}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase
                                                    ${task.type === 'GRAPHIC' ? 'bg-purple-100 text-purple-700' :
                                                        task.type === 'VIDEO' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {task.type}
                                                </span>
                                                {task.client?.name && <span className="truncate max-w-[150px]">— {task.client.name}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900">{new Date(task.createdAt).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-400">{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {task.completed_date ? (
                                                <>
                                                    <div className="text-gray-900">{new Date(task.completed_date).toLocaleDateString()}</div>
                                                    <div className="text-xs text-gray-400">{new Date(task.completed_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 italic">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {task.assigned_by?.avatar_url ? (
                                                    <img src={task.assigned_by.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
                                                        {task.assigned_by?.full_name?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                                <span className="text-gray-700 font-medium">{task.assigned_by?.full_name?.split(' ')[0] || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {task.assignee ? (
                                                <div className="flex items-center gap-2">
                                                    {task.assignee.avatar_url ? (
                                                        <img src={task.assignee.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                                            {task.assignee.full_name?.charAt(0) || '?'}
                                                        </div>
                                                    )}
                                                    <span className="text-gray-700 font-medium">{task.assignee.full_name?.split(' ')[0]}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(task.status)}`}>
                                                {task.status === 'REVISION_REQUESTED' ? 'REVISION' : task.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center items-center gap-2">
                                                {canModify(task) ? (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Prevent row click
                                                                setTaskToEdit(task);
                                                                setSearchParams({ action: 'new' });
                                                            }}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                            title="Edit Task"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Prevent row click
                                                                setDeleteId(task.id);
                                                            }}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                            title="Delete Task"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-gray-300 text-sm italic">Restricted</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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

export default TaskList;
