import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Moon, Sun, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PendingRequestsModal from '@/components/attendance/PendingRequestsModalv2';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#94a3b8']; // Green, Blue, Yellow, Gray

// Clock Component
const DigitalClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="text-right">
            {/* UPDATED: Date Bigger, Time Smaller, 12h Format */}
            <p className="text-xl md:text-2xl font-bold uppercase tracking-wide text-foreground">
                {time.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h2 className="text-lg font-medium font-mono tracking-widest text-primary/80">
                {time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
            </h2>
        </div>
    );
};

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

                    {/* Clock Only - Theme Toggle is now in Global Header */}
                    <DigitalClock />
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Metric Cards */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Card 1: Total Assigned */}
                    <div className="p-6 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
                        <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">Total Assigned</h3>
                        <p className="text-4xl font-bold mt-2 text-purple-900 dark:text-purple-100">{creativeMetrics?.total || 0}</p>
                    </div>
                    {/* Card 2: Completed */}
                    <div className="p-6 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                        <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">Completed</h3>
                        <p className="text-4xl font-bold mt-2 text-green-900 dark:text-green-100">{creativeMetrics?.completed || 0}</p>
                    </div>
                    {/* Card 3: Work In Progress */}
                    <div className="p-6 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                        <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">In Progress</h3>
                        <p className="text-4xl font-bold mt-2 text-blue-900 dark:text-blue-100">{creativeMetrics?.wip || 0}</p>
                    </div>
                    {/* Card 4: Pending Review */}
                    <div className="p-6 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20">
                        <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">Pending Review</h3>
                        <p className="text-4xl font-bold mt-2 text-yellow-900 dark:text-yellow-100">{creativeMetrics?.review || 0}</p>
                    </div>
                </div>

                {/* Right: Pie Chart */}
                <div className="p-6 bg-card rounded-xl border border-border shadow-sm flex flex-col items-center justify-center">
                    <h3 className="text-sm font-bold text-muted-foreground w-full text-left mb-4">Task Status Distribution</h3>
                    <div className="w-full h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={creativeMetrics?.pieChartData || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {(creativeMetrics?.pieChartData || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* --- SECTION 3: DISTRIBUTIONS & EFFICIENCY --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Chart: Task Distribution by Member */}
                <div className="p-6 bg-card rounded-xl border border-border shadow-sm h-[450px] flex flex-col">
                    <h4 className="text-lg font-bold mb-6">Task Distribution by Member</h4>
                    <div className="flex-1 w-full">
                        {teamStats && teamStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={teamStats}
                                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                                    layout="vertical"
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'var(--border)'} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={100}
                                        tick={{ fill: axisColor, fontSize: 13 }}
                                        interval={0}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'var(--accent)', opacity: 0.1 }}
                                        contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                                    />
                                    <Bar dataKey="completedTasks" name="Completed" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                    <Bar dataKey="pendingTasks" name="Pending" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                No performance data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid: Creative Team Efficiency */}
                <div className="p-6 bg-card rounded-xl border border-border shadow-sm h-[450px] overflow-auto custom-scrollbar">
                    <h4 className="text-lg font-bold mb-6">Creative Team Efficiency</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {teamStats?.map((member: any) => (
                            <div key={member.id} className="flex flex-col items-center p-4 bg-secondary/50 rounded-xl border border-border/50 hover:bg-secondary transition-colors">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-3 overflow-hidden ring-2 ring-background">
                                    {member.avatar ? (
                                        <img
                                            // UPDATED: Avatar URL Fix (prepend backend URL if relative)
                                            src={member.avatar.startsWith('http') ? member.avatar : `${(import.meta as any).env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4001'}${member.avatar}`}
                                            alt={member.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        member.name.charAt(0)
                                    )}
                                </div>
                                <h5 className="font-semibold text-foreground text-center">{member.name}</h5>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                                    {member.role.replace(/_/g, ' ').replace('CREATIVE ', '')}
                                </span>

                                {/* Efficiency Bar */}
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-1">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${member.efficiency}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-primary">{member.efficiency}% Efficiency</span>
                            </div>
                        ))}
                    </div>
                    {(!teamStats || teamStats.length === 0) && (
                        <p className="text-center text-muted-foreground py-12">No data available.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
