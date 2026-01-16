import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Clock, Search, Save, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const MyTasks = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Track modified statuses locally: { [taskId]: 'NEW_STATUS' }
    const [modifiedStatuses, setModifiedStatuses] = useState<Record<string, string>>({});

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks', 'my', user?.id],
        queryFn: async () => {
            // Fetch tasks assigned to the current user
            const res = await api.get(`/tasks?assignee_id=${user?.id}`);
            return res.data;
        },
        enabled: !!user?.id
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ taskId, status }: { taskId: string, status: string }) => {
            return await api.patch(`/tasks/${taskId}`, { status });
        },
        onSuccess: (_, variables) => {
            // Remove from modified list
            const newModified = { ...modifiedStatuses };
            delete newModified[variables.taskId];
            setModifiedStatuses(newModified);

            queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            Toast.fire({
                icon: 'success',
                title: 'Status Updated'
            });
        },
        onError: (err: any) => {
            console.error("Task Update Failed:", err);
            let errorMessage = 'Failed to update status';

            if (err.response?.data?.errors) {
                // Format Zod errors
                errorMessage = err.response.data.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('\n');
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }

            Swal.fire('Error', errorMessage, 'error');
        }
    });

    const filteredTasks = tasks?.filter((task: any) => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.campaign?.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.campaign?.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' ? true : task.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT': return 'text-red-600 bg-red-50';
            case 'HIGH': return 'text-orange-600 bg-orange-50';
            case 'MEDIUM': return 'text-blue-600 bg-blue-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const handleStatusChange = (taskId: string, newStatus: string) => {
        setModifiedStatuses(prev => ({
            ...prev,
            [taskId]: newStatus
        }));
    };

    const handleSaveStatus = (taskId: string) => {
        const newStatus = modifiedStatuses[taskId];
        if (newStatus) {
            updateStatusMutation.mutate({ taskId, status: newStatus });
        }
    };

    if (isLoading) return <div className="p-8">Loading My Tasks...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">My Tasks</h2>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Task Name</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Campaign / Client</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Priority</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Due / SLA</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm w-32">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTasks?.map((task: any) => {
                            const currentStatus = modifiedStatuses[task.id] || task.status;
                            const isModified = !!modifiedStatuses[task.id];

                            return (
                                <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-900">{task.title}</div>
                                        <div className="text-xs text-gray-500 mt-1">{task.type} • {task.nature}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-medium text-gray-800">
                                            {task.client?.name || task.campaign?.client?.name || 'General / No Client'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {task.campaign?.title || (task.client ? 'Direct Task' : '-')}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className={task.sla_status === 'BREACHED' ? 'text-red-500' : 'text-gray-400'} />
                                            <span className={`text-sm ${task.sla_status === 'BREACHED' ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                                {task.due_date ? new Date(task.due_date).toLocaleDateString() : (task.sla_target ? new Date(task.sla_target).toLocaleDateString() : '-')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={currentStatus}
                                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                            className={`
                                                text-sm px-2 py-1.5 rounded border focus:outline-none focus:ring-2 focus:ring-purple-200
                                                ${currentStatus === 'COMPLETED' ? 'bg-green-50 text-green-900 border-green-200' : ''}
                                                ${currentStatus === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-900 border-blue-200' : ''}
                                                ${['PLANNED', 'ASSIGNED'].includes(currentStatus) ? 'bg-gray-100 text-gray-700 border-gray-200' : ''}
                                                ${isModified ? 'ring-2 ring-yellow-400 border-yellow-500' : ''} 
                                            `}
                                        >
                                            <option value="ASSIGNED">Assigned</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="REVIEW">Under Review</option>
                                            <option value="REVISION_REQUESTED">Revision Needed</option>
                                            <option value="COMPLETED">Completed</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {isModified ? (
                                                <button
                                                    onClick={() => handleSaveStatus(task.id)}
                                                    disabled={updateStatusMutation.isPending}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-md hover:bg-green-700 shadow-sm animate-in zoom-in"
                                                    title="Save Status"
                                                >
                                                    <Save size={14} />
                                                    Save
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-md text-xs font-medium transition-colors"
                                                >
                                                    Details
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredTasks?.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckCircle2 size={32} className="text-gray-300" />
                                        <p>No tasks found assigned to you. Enjoy your day!</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MyTasks;
