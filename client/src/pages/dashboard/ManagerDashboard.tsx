import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Moon, Sun, Bell, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PendingRequestsModal from '@/components/attendance/PendingRequestsModalv2';
import { getAssetUrl } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#94a3b8']; // Green, Blue, Yellow, Gray

// Clock Component Removed - Moved to Global Layout

// Theme Hook
const useTheme = () => {
    const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDark(document.documentElement.classList.contains('dark'));
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);
    return isDark;
};

import { useSearchParams } from 'react-router-dom';

const ManagerDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const isDarkMode = useTheme();
    const axisColor = isDarkMode ? '#e2e8f0' : '#64748b';
    const [searchParams, setSearchParams] = useSearchParams();
    const highlightRequestId = searchParams.get('requestId'); // slate-200 (dark) vs slate-500 (light)

    // --- DATA FETCHING ---

    // 1. Creative Team Metrics (Cards + Pie)
    const { data: creativeMetrics } = useQuery({
        queryKey: ['creative-metrics'],
        queryFn: async () => (await api.get('/analytics/creative-metrics')).data
    });

    // 2. Attendance Stats
    const { data: attendanceStats } = useQuery({
        queryKey: ['attendance-stats'],
        queryFn: async () => (await api.get('/analytics/attendance')).data
    });

    // 3. Team Member Distribution (Reusing previous endpoint logic)
    const { data: teamStats } = useQuery({
        queryKey: ['team-performance'],
        queryFn: async () => (await api.get('/analytics/team-performance')).data
    });

    // 4. Creative Dashboard Stats (Table Data)
    const { data: creativeDashboard, isLoading: isCreativeLoading } = useQuery({
        queryKey: ['creative-dashboard'],
        queryFn: async () => (await api.get('/analytics/creative-dashboard')).data
    });



    // 4. Pending Requests Count
    const { data: requestCount } = useQuery({
        queryKey: ['pending-requests-count'],
        queryFn: async () => {
            const [leaves, regularisation] = await Promise.all([
                api.get('/leave/requests'),
                api.get('/attendance/regularisation/requests?status=PENDING')
            ]);
            // Filter leaves for PENDING only if API returns all
            const pendingLeaves = leaves.data.filter((l: any) => l.status === 'PENDING');
            return pendingLeaves.length + regularisation.data.length;
        },
        refetchInterval: 30000 // Poll every 30 seconds
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4 border-b">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                        Overview
                    </h1>
                </div>
                <div className="flex items-center gap-6">
                    {/* Pending Requests Button */}
                    <PendingRequestsModal
                        highlightId={highlightRequestId}
                        autoOpen={!!highlightRequestId || searchParams.get('action') === 'review_request'}
                        onOpenChange={(open) => {
                            // If modal closes, clear the requestId from URL so clicking it again works
                            if (!open && (highlightRequestId || searchParams.get('action'))) {
                                const newParams = new URLSearchParams(searchParams);
                                newParams.delete('requestId');
                                newParams.delete('type');
                                newParams.delete('action');
                                setSearchParams(newParams);
                            }
                        }}
                        trigger={
                            <Button variant="outline" className="gap-2 shadow-sm border-orange-200 bg-orange-50/50 hover:bg-orange-50 text-orange-700 relative">
                                <Bell className="h-4 w-4" />
                                Pending Requests
                                {requestCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse ring-2 ring-white" />
                                )}
                            </Button>
                        }
                    />

                    {/* Clock Removed - Now Global */}
                </div>
            </div>

            {/* --- SECTION 1: ATTENDANCE --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {attendanceStats?.map((dept: any) => (
                    <div
                        key={dept.department}
                        className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-all ${dept.styles.card}`}
                    >
                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${dept.styles.label}`}>
                            {dept.department}
                        </h3>
                        <div className="flex items-end justify-between">
                            <span className={`text-4xl font-extrabold ${dept.styles.value}`}>
                                {dept.count}
                            </span>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm ${dept.styles.text}`}>
                                Present
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- SECTION 2: CREATIVE TEAM METRICS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Metric Cards - Taking less space */}
                <div className="lg:col-span-1 grid grid-cols-1 gap-4">
                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
                        <h3 className="text-xs font-semibold text-purple-700 dark:text-purple-300">Total Assigned</h3>
                        <p className="text-2xl font-bold mt-1 text-purple-900 dark:text-purple-100">{creativeMetrics?.total || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                        <h3 className="text-xs font-semibold text-green-700 dark:text-green-300">Completed</h3>
                        <p className="text-2xl font-bold mt-1 text-green-900 dark:text-green-100">{creativeMetrics?.completed || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                        <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-300">In Progress</h3>
                        <p className="text-2xl font-bold mt-1 text-blue-900 dark:text-blue-100">{creativeMetrics?.wip || 0}</p>
                    </div>
                </div>

                {/* A. Creative Tasks assigned today */}
                <div className="lg:col-span-3">
                    <Card className="border shadow-sm h-full rounded-xl overflow-hidden">
                        <CardHeader className="bg-gray-50/50 py-3 px-4 border-b">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200">New</Badge>
                                Creative Tasks Assigned Today
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50/30">
                                        <TableRow>
                                            <TableHead className="w-[80px] text-xs font-bold">S.No</TableHead>
                                            <TableHead className="text-xs font-bold">Staff Name</TableHead>
                                            <TableHead className="text-xs font-bold">Client</TableHead>
                                            <TableHead className="text-xs font-bold">Task Type</TableHead>
                                            <TableHead className="text-xs font-bold">Assigned By</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isCreativeLoading ? (
                                            <TableRow><TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground animate-pulse">Loading today's tasks...</TableCell></TableRow>
                                        ) : creativeDashboard?.dailyTasks?.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground italic">No tasks assigned yet today.</TableCell></TableRow>
                                        ) : (
                                            creativeDashboard?.dailyTasks?.map((task: any) => (
                                                <TableRow key={task.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <TableCell className="text-xs font-medium text-gray-500">{task.s_no}</TableCell>
                                                    <TableCell className="text-xs font-bold text-gray-900">{task.staff_name}</TableCell>
                                                    <TableCell className="text-xs font-medium text-indigo-600">{task.client_name}</TableCell>
                                                    <TableCell className="text-xs font-medium"><Badge variant="outline" className="text-[10px] font-bold py-0">{task.task_type}</Badge></TableCell>
                                                    <TableCell className="text-xs text-gray-600">{task.assigned_by}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* --- SECTION 3: EFFICIENCY TABLES --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* B. Task efficiency of the day */}
                <Card className="border shadow-sm rounded-xl overflow-hidden">
                    <CardHeader className="bg-indigo-600 text-white py-3 px-4">
                        <CardTitle className="text-sm font-bold">Task Efficiency (Daily)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold">Staff</TableHead>
                                        <TableHead className="text-xs font-bold text-right">Performance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creativeDashboard?.dailyEfficiency?.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-gray-50/50">
                                            <TableCell className="text-xs font-semibold">{item.staff_name}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge className={`${item.efficiency >= 80 ? 'bg-green-100 text-green-700' : item.efficiency >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'} text-[10px] font-bold`}>
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

                {/* C. Weekly Creative Team Performance */}
                <Card className="border shadow-sm rounded-xl overflow-hidden">
                    <CardHeader className="bg-blue-600 text-white py-3 px-4">
                        <CardTitle className="text-sm font-bold">Weekly Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold">Staff</TableHead>
                                        <TableHead className="text-xs font-bold text-right">Avg Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creativeDashboard?.weeklyEfficiency?.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-gray-50/50">
                                            <TableCell className="text-xs font-semibold">{item.staff_name}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge className={`${item.efficiency >= 80 ? 'bg-green-500 text-white' : item.efficiency >= 50 ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'} text-[10px] font-bold`}>
                                                    {item.efficiency}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* D. Monthly Creative Team Performance */}
                <Card className="border shadow-sm rounded-xl overflow-hidden">
                    <CardHeader className="bg-purple-600 text-white py-3 px-4">
                        <CardTitle className="text-sm font-bold">Monthly Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold">Staff</TableHead>
                                        <TableHead className="text-xs font-bold text-right">Efficacy</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creativeDashboard?.monthlyEfficiency?.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-gray-50/50">
                                            <TableCell className="text-xs font-semibold">{item.staff_name}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-[10px] font-bold text-gray-600">{item.efficiency}%</span>
                                                    <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-purple-500" style={{ width: `${item.efficiency}%` }} />
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

export default ManagerDashboard;
