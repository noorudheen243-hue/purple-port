import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../../store/authStore';
import UpdateSystemModal from '../../components/modals/UpdateSystemModal';
import { Server } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ExecutiveDashboard = () => {
    const { user } = useAuthStore();
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['dashboard-stats-v2'],
        queryFn: async () => {
            const { data } = await api.get('/tasks/stats');
            return data as {
                distribution: { name: string, value: number }[],
                efficiency: { name: string, total: number, completed: number, efficiency: number }[]
            };
        }
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading dashboard elements...</div>;

    const { distribution, efficiency } = data || { distribution: [], efficiency: [] };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Marketing & SEO Overview
                    </h1>
                    <p className="text-muted-foreground mt-1">Real-time insights into team performance and task distribution.</p>
                </div>

                {/* Developer Admin Only: Update System Button */}
                {user?.role === 'DEVELOPER_ADMIN' && (
                    <button
                        onClick={() => setIsUpdateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium"
                    >
                        <Server size={16} />
                        Update Online System
                    </button>
                )}
            </div>

            <UpdateSystemModal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Task Status Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 hover:shadow-xl transition-shadow">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Task Status Distribution</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Creative Team Efficiency */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 hover:shadow-xl transition-shadow">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Creative Team Efficiency (This Month)</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={efficiency}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                <Legend />
                                <Bar dataKey="completed" name="Completed" stackId="a" fill="#82ca9d" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="total" name="Total Assigned" stackId="a" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Summary Stats Cards */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                    <h3 className="text-white/80 font-medium text-sm">Total Tasks</h3>
                    <p className="text-4xl font-bold mt-2">{distribution.reduce((acc, curr) => acc + curr.value, 0)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                    <h3 className="text-white/80 font-medium text-sm">Completion Rate</h3>
                    <p className="text-4xl font-bold mt-2">
                        {Math.round((distribution.find(d => d.name === 'COMPLETED')?.value || 0) / (distribution.reduce((acc, curr) => acc + curr.value, 0) || 1) * 100)}%
                    </p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                    <h3 className="text-white/80 font-medium text-sm">Team Members</h3>
                    <p className="text-4xl font-bold mt-2">{efficiency.length}</p>
                </div>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
