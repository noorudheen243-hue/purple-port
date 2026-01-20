import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
    CheckCircle, Clock, AlertCircle, Layout, RefreshCw, TrendingUp
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const TaskDashboard = () => {
    // Fetch aggregated stats
    const { data: tasks, isLoading: isTasksLoading } = useQuery({
        queryKey: ['tasks', 'all'],
        queryFn: async () => {
            const res = await api.get('/tasks');
            return res.data;
        }
    });

    const { data: dmStats, isLoading: isDmStatsLoading } = useQuery({
        queryKey: ['portal-global-stats'],
        queryFn: async () => (await api.get('/client-portal/global-stats')).data
    });

    if (isTasksLoading || isDmStatsLoading) return <div className="p-8">Loading Dashboard...</div>;

    // Aggregations
    const total = tasks?.length || 0;
    const completed = tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
    const inProgress = tasks?.filter((t: any) => t.status === 'IN_PROGRESS').length || 0;
    const overdue = tasks?.filter((t: any) => t.status === 'OVERDUE' || (t.sla_status === 'BREACHED')).length || 0;
    const rework = tasks?.filter((t: any) => t.nature === 'REWORK').length || 0;

    const statusData = [
        { name: 'Completed', value: completed },
        { name: 'In Progress', value: inProgress },
        { name: 'Overdue', value: overdue },
        { name: 'Planned', value: total - completed - inProgress - overdue }
    ];

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* DM TASKS OVERVIEW */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={24} className="text-purple-600" />
                    DM Tasks Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Total Ad Spend</p>
                        <h3 className="text-2xl font-bold text-purple-900 mt-1">₹{((dmStats?.meta_spend || 0) + (dmStats?.google_spend || 0)).toLocaleString()}</h3>
                        <p className="text-xs text-gray-500 mt-1">Meta & Google Ads</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-pink-100">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Pending Content</p>
                        <h3 className="text-2xl font-bold text-pink-700 mt-1">{dmStats?.pending_content || 0}</h3>
                        <p className="text-xs text-gray-500 mt-1">Items to Review</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Active Web Dev</p>
                        <h3 className="text-2xl font-bold text-blue-700 mt-1">{dmStats?.active_web_projects || 0}</h3>
                        <p className="text-xs text-gray-500 mt-1">Ongoing Projects</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                        <p className="text-xs text-muted-foreground uppercase font-bold">SEO Clients</p>
                        <h3 className="text-2xl font-bold text-green-700 mt-1">{dmStats?.seo_clients || 0}</h3>
                        <p className="text-xs text-gray-500 mt-1">Active Engagements</p>
                    </div>
                </div>
            </div>

            <div className="border-t pt-6"></div>

            {/* CREATIVE TASKS OVERVIEW */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <CheckCircle size={24} className="text-blue-600" />
                    Creative Tasks Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Layout size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Tasks</p>
                            <h3 className="text-2xl font-bold text-gray-900">{total}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                            <RefreshCw size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Rework Tasks</p>
                            <h3 className="text-2xl font-bold text-gray-900">{rework}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Rework Rate</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {total > 0 ? (rework / total * 100).toFixed(1) : 0}%
                            </h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Completed</p>
                            <h3 className="text-2xl font-bold text-gray-900">{completed}</h3>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold mb-4">Department Load (Mock)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={[
                                        { name: 'Creative', tasks: 12 },
                                        { name: 'Marketing', tasks: 19 },
                                        { name: 'Web', tasks: 8 },
                                        { name: 'Admin', tasks: 24 },
                                    ]}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="tasks" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDashboard;
