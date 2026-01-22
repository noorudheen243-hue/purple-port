import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Edit, Trash2, Search, Filter, ArrowUpDown } from 'lucide-react';
import Swal from 'sweetalert2';
import NewTaskModal from './TaskFormModal';
import { useAuthStore } from '../../store/authStore';

const TaskHistory = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => api.get('/tasks').then(res => res.data)
    });

    const deleteMutation = useMutation({
        mutationFn: async (taskId: string) => {
            return await api.delete(`/tasks/${taskId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            Swal.fire('Deleted!', 'Task has been deleted.', 'success');
        },
        onError: (error: any) => {
            Swal.fire('Error', error.response?.data?.message || 'Failed to delete task', 'error');
        }
    });

    const handleDelete = (taskId: string) => {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(taskId);
            }
        });
    };

    const handleEdit = (task: any) => {
        setSelectedTask(task);
        setIsEditModalOpen(true);
    };

    const filteredTasks = tasks?.filter((task: any) => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.assignee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;

        return matchesSearch && matchesStatus;
    }) || [];

    // Sort by recent first
    const sortedTasks = [...filteredTasks].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search tasks, clients, or assignee..."
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-200 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="text-gray-500" size={18} />
                    <select
                        className="px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-200 outline-none bg-white"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="PLANNED">Planned</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="REVIEW">Review</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                <th className="p-4">Task</th>
                                <th className="p-4">Client</th>
                                <th className="p-4">Assignee</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Created Date</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">Loading tasks...</td>
                                </tr>
                            ) : sortedTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No tasks found.</td>
                                </tr>
                            ) : (
                                sortedTasks.map((task: any) => (
                                    <tr key={task.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{task.title}</p>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${task.priority === 'URGENT' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        task.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                            task.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                'bg-gray-50 text-gray-600 border-gray-200'
                                                    }`}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {task.client?.name || <span className="text-gray-400 italic">Internal / General</span>}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                                                    {task.assignee?.full_name?.charAt(0)}
                                                </div>
                                                <span className="text-sm text-gray-700">{task.assignee?.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                        task.status === 'REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-600'
                                                }`}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {format(new Date(task.created_at), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(task)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Task"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(task.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Task"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <NewTaskModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedTask(null);
                }}
                initialData={selectedTask}
            />
        </div>
    );
};

export default TaskHistory;
