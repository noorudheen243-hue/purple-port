import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Clock, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MyTasks = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks', 'my', user?.id],
        queryFn: async () => {
            // Backend filtering by assignee_id should be strict here.
            // Using query param to filter for "My Tasks"
            const res = await api.get(`/tasks?assignee_id=${user?.id}`);
            return res.data;
        },
        enabled: !!user?.id
    });

    const filteredTasks = tasks?.filter((task: any) => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                            <th className="p-4 font-semibold text-gray-600 text-sm">SLA / Due</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTasks?.map((task: any) => (
                            <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-4">
                                    <div className="font-medium text-gray-900">{task.title}</div>
                                    <div className="text-xs text-gray-500 mt-1">{task.nature}</div>
                                </td>
                                <td className="p-4">
                                    <div className="text-sm font-medium text-gray-800">{task.campaign?.client?.name || 'Unknown Client'}</div>
                                    <div className="text-xs text-gray-500">{task.campaign?.title}</div>
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
                                            {task.sla_target ? new Date(task.sla_target).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                                    >
                                        Open
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredTasks?.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    No tasks found. Great job!
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
