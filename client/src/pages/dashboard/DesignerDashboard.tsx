import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Layout, TrendingUp, Calendar, BadgeCheck, CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#8884d8'];

const DesignerDashboard = () => {
    const { user } = useAuthStore();
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

    const { data: creativeDashboard, isLoading: isCreativeLoading } = useQuery({
        queryKey: ['creative-dashboard'],
        queryFn: async () => (await api.get('/analytics/creative-dashboard')).data
    });

    const { data: myTasks, isLoading: isTasksLoading } = useQuery({
        queryKey: ['tasks', 'my-active', user?.id],
        queryFn: async () => {
            const { data } = await api.get('/tasks', { params: { assignee_id: user?.id } });
            // Filter for active/pending tasks
            return (data as any[]).filter(t => ['ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'REVISION_REQUESTED'].includes(t.status));
        },
        enabled: !!user?.id
    });

    if (isLoading || isCreativeLoading || isTasksLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading workspace...</div>;

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

            {/* --- SECTION 0: MY ACTIVE TASKS --- */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="border shadow-lg rounded-xl overflow-hidden bg-slate-900 text-white">
                    <CardHeader className="bg-slate-800 py-4 px-6 border-b border-slate-700">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <CheckSquare size={20} className="text-orange-400" />
                                My Active Tasks
                            </CardTitle>
                            <Badge className="bg-orange-500 text-white border-none">{myTasks?.length || 0} Pending</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-800/50">
                                    <TableRow className="border-slate-700 hover:bg-transparent">
                                        <TableHead className="text-slate-400 font-bold">Task Title</TableHead>
                                        <TableHead className="text-slate-400 font-bold">Client</TableHead>
                                        <TableHead className="text-slate-400 font-bold">Type</TableHead>
                                        <TableHead className="text-slate-400 font-bold">Deadline</TableHead>
                                        <TableHead className="text-slate-400 font-bold text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!myTasks || myTasks.length === 0 ? (
                                        <TableRow className="border-slate-800">
                                            <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic font-medium">
                                                No active tasks assigned to you. Enjoy the breather!
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        myTasks.map((task: any) => (
                                            <TableRow key={task.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                                                <TableCell className="font-bold">
                                                    <div className="flex flex-col">
                                                        <span>{task.title}</span>
                                                        <span className="text-[10px] text-slate-500 font-normal truncate max-w-[300px]">{task.description}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-orange-400">
                                                    {task.client?.name || 'Internal'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-slate-700 text-slate-300 border-slate-600" variant="outline">
                                                        {task.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-400 text-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={12} />
                                                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Set Date'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge className={`
                                                        ${task.status === 'REVIEW' ? 'bg-amber-500' :
                                                            task.status === 'IN_PROGRESS' ? 'bg-blue-600' :
                                                                task.status === 'REVISION_REQUESTED' ? 'bg-red-500' : 'bg-slate-600'} 
                                                        text-white border-none font-bold text-[10px]
                                                    `}>
                                                        {task.status.replace(/_/g, ' ')}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- SECTION 1: TODAY'S CREATIVE TASKS --- */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="border shadow-lg rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 px-6">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Layout size={20} />
                            My Team's Tasks Assigned Today
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
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground animate-pulse font-medium text-sm">Refreshing creative assignments...</TableCell></TableRow>
                                    ) : creativeDashboard?.dailyTasks?.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic font-medium text-sm">No tasks assigned to your team yet today.</TableCell></TableRow>
                                    ) : (
                                        creativeDashboard?.dailyTasks?.map((task: any) => (
                                            <TableRow key={task.id} className="hover:bg-gray-50 transition-colors">
                                                <TableCell className="font-semibold text-gray-400">{task.s_no}</TableCell>
                                                <TableCell className="font-bold text-gray-800">{task.staff_name}</TableCell>
                                                <TableCell className="font-bold text-orange-600">{task.client_name}</TableCell>
                                                <TableCell><Badge className="bg-orange-50 text-orange-700 border-orange-100 font-bold" variant="outline">{task.task_type}</Badge></TableCell>
                                                <TableCell className="text-gray-500 font-medium">{task.assigned_by}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- SECTION 2: PERFORMANCE OVERVIEW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* B. Daily Efficiency */}
                <Card className="border shadow-md rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-amber-500 text-white py-3 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold">Daily Scorecard</CardTitle>
                        <TrendingUp size={18} />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold uppercase">Staff</TableHead>
                                        <TableHead className="text-xs font-bold text-right uppercase">Efficiency</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creativeDashboard?.dailyEfficiency?.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className={`text-sm font-bold ${item.id === user?.id ? 'text-orange-600' : 'text-gray-600'}`}>
                                                {item.staff_name} {item.id === user?.id && '(Me)'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge className={`${item.efficiency >= 80 ? 'bg-green-100 text-green-700 border-green-200' : item.efficiency >= 50 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-red-100 text-red-700 border-red-200'} font-black text-xs`}>
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
                    <CardHeader className="bg-blue-500 text-white py-3 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold">Weekly Performance</CardTitle>
                        <Calendar size={18} />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold uppercase">Staff</TableHead>
                                        <TableHead className="text-xs font-bold text-right uppercase">Rank</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creativeDashboard?.weeklyEfficiency?.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className={`text-sm font-bold ${item.id === user?.id ? 'text-blue-600' : 'text-gray-600'}`}>
                                                {item.staff_name}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${item.efficiency >= 80 ? 'bg-green-500 text-white shadow-sm' : item.efficiency >= 50 ? 'bg-blue-500 text-white shadow-sm' : 'bg-slate-300 text-white shadow-inner'}`}>
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
                    <CardHeader className="bg-indigo-500 text-white py-3 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold">Monthly Efficacy</CardTitle>
                        <BadgeCheck size={20} />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold uppercase">Staff</TableHead>
                                        <TableHead className="text-xs font-bold text-right uppercase">Track</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creativeDashboard?.monthlyEfficiency?.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className={`text-sm font-bold ${item.id === user?.id ? 'text-indigo-600' : 'text-gray-600'}`}>
                                                {item.staff_name}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[10px] font-black text-indigo-600 leading-none">{item.efficiency}%</span>
                                                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner border border-gray-100">
                                                        <div
                                                            className={`h-full ${item.id === user?.id ? 'bg-indigo-600 shadow-md' : 'bg-indigo-400 opacity-60'}`}
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
        </div>
    );
};

export default DesignerDashboard;
