import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../../store/authStore';
import UpdateSystemModal from '../../components/modals/UpdateSystemModal';
import { Server, Users, BadgeCheck, TrendingUp, Calendar, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ExecutiveDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
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

    const { data: creativeDashboard, isLoading: isCreativeLoading } = useQuery({
        queryKey: ['creative-dashboard'],
        queryFn: async () => (await api.get('/analytics/creative-dashboard')).data
    });

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

            {/* --- SECTION 1: TODAY'S CREATIVE TASKS --- */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="border shadow-lg rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Layout size={20} />
                            Creative Tasks Assigned Today
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-[80px] font-bold">S.No</TableHead>
                                        <TableHead className="font-bold">Staff Name</TableHead>
                                        <TableHead className="font-bold">Client</TableHead>
                                        <TableHead className="font-bold">Task Type</TableHead>
                                        <TableHead className="font-bold">Assigned By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isCreativeLoading ? (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground animate-pulse font-medium">Synchronizing today's assignments...</TableCell></TableRow>
                                    ) : creativeDashboard?.dailyTasks?.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic font-medium">No new creative tasks assigned yet today.</TableCell></TableRow>
                                    ) : (
                                        creativeDashboard?.dailyTasks?.map((task: any) => (
                                            <TableRow key={task.id} className="hover:bg-gray-50 transition-colors">
                                                <TableCell className="font-semibold text-gray-500">{task.s_no}</TableCell>
                                                <TableCell className="font-bold text-gray-900">{task.staff_name}</TableCell>
                                                <TableCell className="font-bold text-indigo-600">{task.client_name}</TableCell>
                                                <TableCell><Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold">{task.task_type}</Badge></TableCell>
                                                <TableCell className="text-gray-600 font-medium">{task.assigned_by}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- SECTION 2: EFFICIENCY OVERVIEW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* B. Daily Efficiency */}
                <Card className="border shadow-md rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-emerald-600 text-white py-3 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold">Today's Efficiency</CardTitle>
                        <TrendingUp size={16} />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold uppercase">Member</TableHead>
                                        <TableHead className="text-xs font-bold text-right uppercase">Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creativeDashboard?.dailyEfficiency?.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className="text-sm font-bold text-gray-700">{item.staff_name}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge className={`${item.efficiency >= 80 ? 'bg-green-100 text-green-700 border-green-200' : item.efficiency >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200'} font-black text-xs px-2`}>
                                                    {item.efficiency}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* C. Weekly Performance */}
                <Card className="border shadow-md rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-cyan-600 text-white py-3 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold">Weekly Performance</CardTitle>
                        <Calendar size={16} />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold uppercase">Member</TableHead>
                                        <TableHead className="text-xs font-bold text-right uppercase">Avg</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creativeDashboard?.weeklyEfficiency?.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className="text-sm font-bold text-gray-700">{item.staff_name}</TableCell>
                                            <TableCell className="text-right">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${item.efficiency >= 80 ? 'bg-green-600 text-white' : item.efficiency >= 50 ? 'bg-cyan-600 text-white' : 'bg-slate-400 text-white shadow-inner uppercase'}`}>
                                                    {item.efficiency}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* D. Monthly Performance */}
                <Card className="border shadow-md rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-rose-600 text-white py-3 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold">Monthly Efficacy</CardTitle>
                        <BadgeCheck size={18} />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold uppercase">Member</TableHead>
                                        <TableHead className="text-xs font-bold text-right uppercase">Progress</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creativeDashboard?.monthlyEfficiency?.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className="text-sm font-bold text-gray-700">{item.staff_name}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[10px] font-black text-rose-600 leading-none">{item.efficiency}%</span>
                                                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner border border-gray-200">
                                                        <div
                                                            className="h-full bg-rose-500 shadow-sm"
                                                            style={{ width: `${item.efficiency}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Lead Management Quick Action */}
            <div
                onClick={() => navigate('/dashboard/client-portal/manage-services')}
                className="bg-white p-6 rounded-xl shadow-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between group"
            >
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-100 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform shadow-sm">
                        <Users size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">Lead Management & Campaign History</h3>
                        <p className="text-gray-500 font-medium">Track daily leads, follow-ups, and active service performances.</p>
                    </div>
                </div>
                <div className="mr-4 text-indigo-600 font-black flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                    Open Manager <Users size={20} />
                </div>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
