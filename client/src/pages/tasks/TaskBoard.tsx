import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Filter, Calendar as CalIcon, Edit, Trash2 } from 'lucide-react';
import TaskEditModal from './TaskEditModal';
import { useAuthStore } from '../../store/authStore';

const TaskBoard = () => {
    const [month, setMonth] = useState(''); // Empty default to show ALL
    const [department, setDepartment] = useState('ALL');

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks', 'board', month, department],
        queryFn: async () => {
            const params: any = {};

            // Only apply date filter if month is selected
            if (month) {
                params.start_date = `${month}-01`;
                params.end_date = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).toISOString().slice(0, 10);
            }

            const res = await api.get('/tasks', { params });
            return res.data;
        }
    });

    const filteredTasks = tasks?.filter((task: any) => {
        // Department logic requires assignee dept
        const matchesDept = department === 'ALL' ? true : task.assignee?.department === department;
        return matchesDept;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200';
            case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'REVIEW': return 'text-purple-600 bg-purple-50 border-purple-200';
            case 'PLANNED': return 'text-gray-500 bg-gray-50 border-gray-200';
            default: return 'text-gray-500 bg-gray-50 border-gray-200';
        }
    };

    const { user } = useAuthStore(); // Get current user for permission check using authStore
    const queryClient = useQueryClient();
    const [editingTask, setEditingTask] = useState<any>(null);

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/tasks/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || "Failed to delete task");
        }
    });

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this task?")) {
            deleteMutation.mutate(id);
        }
    };

    const canModify = user?.department !== 'CREATIVE' && user?.role !== 'CREATIVE_DESIGNER';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <CalIcon className="text-purple-600" />
                        Task Board History
                    </h2>
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm"
                    />
                </div>

                <div className="flex gap-2">
                    <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="bg-gray-100 text-gray-700 rounded-md text-sm font-medium px-4 py-2 border-none outline-none"
                    >
                        <option value="ALL">All Departments</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="CREATIVE">Creative</option>
                        <option value="WEB">Web</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50/50 border-b border-gray-200 font-semibold text-gray-600">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Client / Campaign</th>
                            <th className="p-4">Task Name</th>
                            <th className="p-4">Type / Nature</th>
                            <th className="p-4">Assigned To</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Est. vs Actual</th>
                            {canModify && <th className="p-4 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTasks?.map((task: any) => (
                            <tr key={task.id} className="hover:bg-gray-50/30">
                                <td className="p-4 text-gray-500">
                                    {(task.actual_start_date || task.createdAt).slice(0, 10)}
                                </td>
                                <td className="p-4">
                                    <div className="font-medium text-gray-800">{task.campaign?.client?.name}</div>
                                    <div className="text-xs text-gray-400">{task.campaign?.title}</div>
                                </td>
                                <td className="p-4 font-medium text-gray-900">
                                    {task.title}
                                </td>
                                <td className="p-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                                        {task.type}
                                    </span>
                                    {task.nature === 'REWORK' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                            REWORK
                                        </span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        {task.assignee ? (
                                            <>
                                                {task.assignee.avatar_url ? (
                                                    <img src={task.assignee.avatar_url} className="w-6 h-6 rounded-full" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                                        {task.assignee.full_name?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                                <span className="text-gray-700">{task.assignee.full_name.split(' ')[0]}</span>
                                            </>
                                        ) : (
                                            <span className="text-gray-400 italic">Unassigned</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(task.status)}`}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600">
                                    {task.actual_time_minutes > 0 ? (
                                        <span className={task.actual_time_minutes > (task.estimated_hours * 60) ? 'text-red-600' : 'text-green-600'}>
                                            {task.actual_time_minutes}m
                                        </span>
                                    ) : '-'}
                                    <span className="text-gray-400 mx-1">/</span>
                                    <span className="text-gray-400">{task.estimated_hours ? Math.round(task.estimated_hours * 60) + 'm' : 'N/A'}</span>
                                </td>
                                {canModify && (
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setEditingTask(task)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Edit Task"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(task.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Delete Task"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {filteredTasks?.length === 0 && (
                            <tr>
                                <td colSpan={canModify ? 8 : 7} className="p-8 text-center text-gray-500">
                                    No history for this month.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingTask && (
                <TaskEditModal
                    isOpen={!!editingTask}
                    onClose={() => setEditingTask(null)}
                    task={editingTask}
                />
            )}
        </div>
    );
};

export default TaskBoard;
