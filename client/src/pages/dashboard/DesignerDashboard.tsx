import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#8884d8'];

const DesignerDashboard = () => {
    const { data, isLoading } = useQuery({
        queryKey: ['designer-stats'],
        queryFn: async () => {
            const { data } = await api.get('/tasks/stats');
            return data as {
                distribution: { name: string, value: number }[],
                efficiency: { name: string, total: number, completed: number, efficiency: number }[]
            };
        }
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading workspace...</div>;

    const { distribution } = data || { distribution: [] };
    const myStats = data?.efficiency[0] || { total: 0, completed: 0, efficiency: 0 };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                    My Creative Space
                </h1>
                <p className="text-muted-foreground mt-1">Track your tasks and performance.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. My Task Status */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-orange-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">My Current Month's Tasks</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
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

                {/* 2. My Performance Card */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-orange-100 flex flex-col justify-center items-center text-center">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Efficiency Score</h2>
                    <div className="relative w-48 h-48 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="96"
                                cy="96"
                                r="88"
                                className="stroke-current text-gray-200"
                                strokeWidth="12"
                                fill="none"
                            />
                            <circle
                                cx="96"
                                cy="96"
                                r="88"
                                className="stroke-current text-green-500 transition-all duration-1000 ease-out"
                                strokeWidth="12"
                                fill="none"
                                strokeDasharray={2 * Math.PI * 88}
                                strokeDashoffset={2 * Math.PI * 88 * (1 - myStats.efficiency / 100)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold text-gray-800">{myStats.efficiency}%</span>
                            <span className="text-xs text-gray-500 uppercase tracking-wider mt-1">Completion Rate</span>
                        </div>
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                        <div className="bg-orange-50 p-3 rounded-lg">
                            <span className="block text-2xl font-bold text-orange-600">{myStats.total}</span>
                            <span className="text-xs text-orange-800">Total Tasks</span>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                            <span className="block text-2xl font-bold text-green-600">{myStats.completed}</span>
                            <span className="text-xs text-green-800">Completed</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesignerDashboard;
